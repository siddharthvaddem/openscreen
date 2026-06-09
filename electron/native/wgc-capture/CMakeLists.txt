cmake_minimum_required(VERSION 3.20)

# The local Windows SDK image used by some contributors can miss gdi32.lib,
# while CMake's default MSVC console template links it unconditionally. This
# helper does not use GDI, so keep the standard library set minimal and explicit.
set(CMAKE_CXX_STANDARD_LIBRARIES
  "kernel32.lib user32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib comdlg32.lib advapi32.lib"
  CACHE STRING "" FORCE)

project(openscreen-wgc-capture LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_executable(wgc-capture
  src/audio_sample_utils.cpp
  src/audio_sample_utils.h
  src/dshow_webcam_capture.cpp
  src/dshow_webcam_capture.h
  src/main.cpp
  src/mf_encoder.cpp
  src/mf_encoder.h
  src/monitor_utils.cpp
  src/monitor_utils.h
  src/wasapi_loopback_capture.cpp
  src/wasapi_loopback_capture.h
  src/webcam_capture.cpp
  src/webcam_capture.h
  src/wgc_session.cpp
  src/wgc_session.h
)

target_compile_definitions(wgc-capture PRIVATE
  NOMINMAX
  WIN32_LEAN_AND_MEAN
  _WIN32_WINNT=0x0A00
)

target_compile_options(wgc-capture PRIVATE /EHsc /W4 /utf-8 /await)

target_link_libraries(wgc-capture PRIVATE
  d3d11
  dxgi
  mf
  mfplat
  mfreadwrite
  mfuuid
  runtimeobject
  windowsapp
)

add_executable(cursor-sampler
  src/cursor-sampler.cpp
)

target_compile_definitions(cursor-sampler PRIVATE
  NOMINMAX
  _WIN32_WINNT=0x0A00
)

target_compile_options(cursor-sampler PRIVATE /EHsc /W4 /utf-8)

target_link_libraries(cursor-sampler PRIVATE
  gdi32
  gdiplus
)
