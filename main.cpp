// =============================================================
// EdgeSentinel — ESP32-CAM Sensor Node Firmware
// =============================================================
// Team B2_BOMBER | IIIT Delhi
// Offline edge security system for rural India
// =============================================================

#include <Arduino.h>
#include "edge_sentinel.h"
#include "pins_config.h"
#include "camera_module.h"
#include "pir_sensor.h"
#include "sd_storage.h"
#include "alarm.h"
#include "espnow_sender.h"

// ---- Gateway MAC Address ----
// ** IMPORTANT: Replace with your NodeMCU's actual MAC address! **
// Run the gateway firmware first — it prints its MAC on boot.
static const uint8_t GATEWAY_MAC[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};

// ---- State Machine ----
static SystemState currentState = STATE_IDLE;
static unsigned long stateTimer = 0;
static int imageCounter = 0;
static bool sdAvailable = false;

// ---- Status LED helpers ----
void status_led(bool on) {
    // GPIO 33 LED is active LOW on AI-Thinker
    digitalWrite(STATUS_LED_PIN, on ? LOW : HIGH);
}

void blink_status(int times, int interval_ms) {
    for (int i = 0; i < times; i++) {
        status_led(true);
        delay(interval_ms);
        status_led(false);
        delay(interval_ms);
    }
}

// =============================================================
// SETUP
// =============================================================
void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println();
    Serial.println("╔══════════════════════════════════════╗");
    Serial.println("║     EdgeSentinel — Sensor Node       ║");
    Serial.println("║     Team B2_BOMBER | IIIT Delhi      ║");
    Serial.println("╚══════════════════════════════════════╝");
    Serial.println();

    // Status LED
    pinMode(STATUS_LED_PIN, OUTPUT);
    status_led(true);

    // Initialize all modules
    Serial.println("--- Initializing Modules ---");

    bool camOK = camera_init();
    if (!camOK) {
        Serial.println("[SYSTEM] CRITICAL: Camera failed! Halting.");
        while (true) { blink_status(5, 100); delay(1000); }
    }

    pir_init();
    alarm_init();

    sdAvailable = sd_init();
    if (sdAvailable) {
        imageCounter = sd_get_next_image_number();
    } else {
        Serial.println("[SYSTEM] WARNING: SD card not available — no evidence storage");
    }

    bool espnowOK = espnow_init(GATEWAY_MAC);
    if (!espnowOK) {
        Serial.println("[SYSTEM] WARNING: ESP-NOW failed — no gateway alerts");
    }

    Serial.println();
    Serial.println("--- All Modules Initialized ---");
    Serial.println("[SYSTEM] EdgeSentinel ARMED. Watching for motion...");
    Serial.println();

    // Signal ready: 3 quick blinks
    blink_status(3, 150);
    status_led(false);

    currentState = STATE_IDLE;
}

// =============================================================
// MAIN LOOP — State Machine
// =============================================================
void loop() {
    switch (currentState) {

        // --------------------------------------------------
        // IDLE: Waiting for PIR motion trigger
        // --------------------------------------------------
        case STATE_IDLE: {
            // Keep alarm updated (handles auto-stop)
            alarm_is_active();

            if (pir_motion_detected()) {
                Serial.println("\n[STATE] >>> MOTION DETECTED <<<");
                pir_clear();
                currentState = STATE_MOTION_DETECTED;
                stateTimer = millis();
            }
            break;
        }

        // --------------------------------------------------
        // MOTION DETECTED: Flash LED + Capture frame
        // --------------------------------------------------
        case STATE_MOTION_DETECTED: {
            status_led(true);

            // Brief flash for night illumination
            flash_led_on();
            delay(100);

            currentState = STATE_CAPTURING;
            break;
        }

        // --------------------------------------------------
        // CAPTURING: Take camera snapshot
        // --------------------------------------------------
        case STATE_CAPTURING: {
            camera_fb_t* fb = camera_capture_jpeg();
            flash_led_off();

            if (!fb) {
                Serial.println("[STATE] Camera capture failed — returning to IDLE");
                status_led(false);
                currentState = STATE_COOLDOWN;
                stateTimer = millis();
                break;
            }

            // Save evidence to SD card
            if (sdAvailable) {
                sd_save_image(fb->buf, fb->len, imageCounter);
                char logMsg[80];
                snprintf(logMsg, sizeof(logMsg), "Motion alert #%d, image: %u bytes", imageCounter, fb->len);
                sd_log_event(logMsg);
                imageCounter++;
            }

            // For now, treat all motion-with-capture as alerts
            // (Face detection will be added in Phase 2)
            Serial.println("[STATE] >>> ALERT: Motion captured! <<<");

            // Build and send alert to gateway
            AlertPacket alert;
            alert.device_id  = DEVICE_ID;
            alert.alert_type = ALERT_INTRUDER;
            alert.timestamp  = millis();
            alert.image_size = fb->len;
            snprintf(alert.message, sizeof(alert.message),
                "ALERT: Motion detected! Image #%d (%u bytes)", imageCounter - 1, fb->len);

            // Return the camera frame buffer
            camera_return_frame(fb);

            // Send alert via ESP-NOW to gateway
            espnow_send_alert(&alert);

            // Trigger the alarm
            alarm_trigger();

            currentState = STATE_COOLDOWN;
            stateTimer = millis();
            break;
        }

        // --------------------------------------------------
        // COOLDOWN: Wait before re-arming
        // --------------------------------------------------
        case STATE_COOLDOWN: {
            // Keep alarm siren running during cooldown
            alarm_is_active();

            if (millis() - stateTimer > COOLDOWN_MS) {
                Serial.println("[STATE] Cooldown complete — re-arming");
                alarm_stop();
                status_led(false);
                pir_clear();
                currentState = STATE_IDLE;
            }
            break;
        }

        default:
            currentState = STATE_IDLE;
            break;
    }

    delay(10);  // Small delay to prevent watchdog resets
}
