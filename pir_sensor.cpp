#include "pir_sensor.h"
#include "edge_sentinel.h"

// Volatile flag set by ISR
static volatile bool _motion_flag = false;
static unsigned long _last_trigger = 0;

// Interrupt Service Routine — keep it minimal
static void IRAM_ATTR pir_isr() {
    unsigned long now = millis();
    if (now - _last_trigger > PIR_DEBOUNCE_MS) {
        _motion_flag = true;
        _last_trigger = now;
    }
}

void pir_init() {
    pinMode(PIR_PIN, INPUT);
    attachInterrupt(digitalPinToInterrupt(PIR_PIN), pir_isr, RISING);
    Serial.println("[PIR] Initialized on GPIO " + String(PIR_PIN));
}

bool pir_motion_detected() {
    return _motion_flag;
}

void pir_clear() {
    _motion_flag = false;
}
