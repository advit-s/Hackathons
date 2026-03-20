#pragma once
#include <Arduino.h>

// =============================================================
// Alarm / Buzzer Module
// =============================================================

void alarm_init();
void alarm_trigger();
void alarm_stop();
bool alarm_is_active();
