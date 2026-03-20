#pragma once

// =============================================================
// EdgeSentinel — Pin Configuration (ESP32-CAM AI-Thinker)
// =============================================================

// ---- Camera OV3660 / OV2640 (AI-Thinker fixed pinout) ----
#define CAM_PIN_PWDN     32
#define CAM_PIN_RESET    -1   // Tied to 3.3V on board
#define CAM_PIN_XCLK      0
#define CAM_PIN_SIOD     26
#define CAM_PIN_SIOC     27

#define CAM_PIN_D7       35
#define CAM_PIN_D6       34
#define CAM_PIN_D5       39
#define CAM_PIN_D4       36
#define CAM_PIN_D3       21
#define CAM_PIN_D2       19
#define CAM_PIN_D1       18
#define CAM_PIN_D0        5

#define CAM_PIN_VSYNC    25
#define CAM_PIN_HREF     23
#define CAM_PIN_PCLK     22

// ---- MicroSD Card (built-in, 1-bit SD_MMC mode) ----
// Uses GPIO 2 (DATA0), 14 (CLK), 15 (CMD) — no defines needed,
// SD_MMC library handles them internally in 1-bit mode.

// ---- PIR Motion Sensor ----
#define PIR_PIN          13   // Freed by 1-bit SD mode

// ---- Buzzer / Siren ----
#define BUZZER_PIN       12   // Freed by 1-bit SD mode

// ---- IR LED / Flash ----
#define FLASH_LED_PIN     4   // Onboard flash LED

// ---- Status LED ----
#define STATUS_LED_PIN   33   // Onboard red LED (active LOW)
