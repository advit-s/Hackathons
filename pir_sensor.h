#pragma once
#include <Arduino.h>
#include "pins_config.h"

// =============================================================
// PIR Motion Sensor Module
// =============================================================

void pir_init();
bool pir_motion_detected();
void pir_clear();
