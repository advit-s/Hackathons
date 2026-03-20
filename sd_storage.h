#pragma once
#include <Arduino.h>

// =============================================================
// MicroSD Storage Module (1-bit SD_MMC on ESP32-CAM)
// =============================================================

bool sd_init();
bool sd_save_image(const uint8_t* data, size_t len, int image_number);
bool sd_log_event(const char* message);
int  sd_get_next_image_number();
