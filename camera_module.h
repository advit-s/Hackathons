#pragma once
#include <Arduino.h>
#include "esp_camera.h"

// =============================================================
// Camera Module (OV3660 / OV2640 on AI-Thinker ESP32-CAM)
// =============================================================

bool camera_init();
camera_fb_t* camera_capture_jpeg();
void camera_return_frame(camera_fb_t* fb);
void flash_led_on();
void flash_led_off();
