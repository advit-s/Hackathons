#pragma once
#include <Arduino.h>

// =============================================================
// EdgeSentinel — System State Machine & Configuration
// =============================================================

// ---- System States ----
enum SystemState {
    STATE_IDLE,              // Waiting for PIR trigger
    STATE_MOTION_DETECTED,   // PIR fired — preparing capture
    STATE_CAPTURING,         // Taking camera frame
    STATE_FACE_CHECK,        // Running face detection
    STATE_ALERT,             // Intruder confirmed — alarm active
    STATE_SENDING_ALERT,     // Sending ESP-NOW to gateway
    STATE_LOGGING,           // Saving evidence to SD
    STATE_COOLDOWN,          // Waiting before re-arming
};

// ---- Alert Types (sent via ESP-NOW to gateway) ----
enum AlertType : uint8_t {
    ALERT_INTRUDER   = 0x01,  // Face detected, no auth
    ALERT_MOTION     = 0x02,  // Motion only (no face)
    ALERT_TAMPER     = 0x03,  // Device tamper detected
    ALERT_TEST       = 0xFF,  // Test alert
};

// ---- ESP-NOW Alert Packet ----
// Must be ≤ 250 bytes (ESP-NOW limit)
typedef struct __attribute__((packed)) {
    uint8_t  device_id;       // Unique device identifier
    uint8_t  alert_type;      // AlertType enum
    uint32_t timestamp;       // millis() at detection
    uint16_t image_size;      // Size of captured JPEG (for reference)
    char     message[64];     // Human-readable alert text
} AlertPacket;

// ---- Configuration Constants ----
#define DEVICE_ID              1        // Unique ID for this sensor node
#define COOLDOWN_MS            30000    // 30s cooldown between alerts
#define PIR_DEBOUNCE_MS        2000     // Ignore PIR re-triggers for 2s
#define FACE_DETECT_TIMEOUT_MS 5000     // Max time to wait for face detection
#define BUZZER_DURATION_MS     10000    // Buzzer sounds for 10 seconds
#define ALERT_PHONE_NUMBER     "+91XXXXXXXXXX"  // Owner's phone number

// Camera settings
#define CAM_FRAME_SIZE         FRAMESIZE_VGA    // 640x480 for JPEG capture
#define CAM_JPEG_QUALITY       12               // 1-63, lower = better quality
#define CAM_FB_COUNT           2                // Frame buffer count (with PSRAM)
