#include "alarm.h"
#include "pins_config.h"
#include "edge_sentinel.h"

static bool _alarm_active = false;
static unsigned long _alarm_start = 0;

void alarm_init() {
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);
    Serial.println("[ALARM] Initialized on GPIO " + String(BUZZER_PIN));
}

void alarm_trigger() {
    _alarm_active = true;
    _alarm_start = millis();
    Serial.println("[ALARM] 🚨 TRIGGERED!");
}

void alarm_stop() {
    _alarm_active = false;
    digitalWrite(BUZZER_PIN, LOW);
    Serial.println("[ALARM] Stopped");
}

bool alarm_is_active() {
    if (!_alarm_active) return false;

    // Auto-stop after duration
    if (millis() - _alarm_start > BUZZER_DURATION_MS) {
        alarm_stop();
        return false;
    }

    // Pulsing siren pattern: 500ms on, 200ms off
    unsigned long elapsed = (millis() - _alarm_start) % 700;
    digitalWrite(BUZZER_PIN, elapsed < 500 ? HIGH : LOW);

    return true;
}
