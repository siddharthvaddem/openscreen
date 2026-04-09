# Clipwise 참고 메모 for Auto Screen

분석 대상
- https://github.com/kwakseongjae/clipwise
- 로컬 경로: /Users/admin/Desktop/clipwise

핵심 인사이트
1. 단순 녹화 툴이 아니라 “입력 기반으로 polished 결과를 만든다”는 철학이 강함
2. 사용자가 세부 슬라이더를 많이 만지지 않아도 preset과 automation으로 결과 품질을 올림
3. Zoom / Cursor / Output 품질 / 시나리오화가 특히 강점

Auto Screen에 바로 반영 가치가 큰 항목

Must에 가까운 항목
1. Zoom 강도 프리셋
- subtle / light / moderate / strong / dramatic 같은 의미 기반 줌 강도
- 현재 숫자 중심보다 초보자가 이해하기 쉬움

2. Spring 기반 줌 easing
- Clipwise는 spring easing으로 자연스러운 카메라 감각을 강조함
- Auto Screen 자동 줌에도 바로 체감이 큰 개선 포인트

3. 인접 상호작용을 하나의 zoom zone으로 합치기
- 가까운 클릭/포커스 포인트를 하나의 연속 구간으로 취급
- 불필요한 zoom-out → zoom-in 반복 감소

4. Focus point interpolation
- 포인트 간 즉시 점프보다 부드러운 pan
- 현재 Auto Screen의 auto follow 품질을 올리는 핵심

5. Cursor 효과 패키지
- trail
- ripple
- highlight/halo
- 클릭 지점 강조
- 현재 Auto Screen에서 체감 개선 폭이 큼

6. Output preset 체계
- social / balanced / archive 같은 품질 프리셋
- 현재 good/source/medium보다 의도 기반으로 이해하기 쉬움

Should 항목
7. Smart speed / wait compression 개념
- 기다리는 구간을 자동 압축
- 로딩/대기 구간을 덜 지루하게 보이게 함
- Auto Screen에서는 초기에는 “정적 구간 자동 압축” 형태로 단순화 가능

8. Keystroke HUD
- 강의/데모에 유용
- 특히 단축키 중심 설명 영상에서 강점

9. Scriptable / scenario export 경로
- 장기적으로는 AI agent와 연결성이 큼
- Auto Screen에서 나중에 “record recipe” 또는 “demo script” 기능으로 발전 가능

10. Device/frame preset 사고방식
- Browser / phone / tablet 같은 presentation preset
- Auto Screen의 export preset과 연결 가능

Nice-to-have
11. YAML 시나리오 기반 녹화 자동화
- 지금 당장은 범위가 큼
- 하지만 장기적으로 AI agent 자동 데모 제작과 아주 잘 맞음

12. Watermark / transition library
- 제품 마감 품질 향상에 도움
- 현재 1차 구현 우선순위는 아님

Auto Screen 우선순위 업데이트

1차 구현 추천
- 한국어/영어 전환 + Settings 진입점
- 기본 스타일 기본값 개선
- Zoom intensity preset 추가
- spring easing 기반 auto zoom 개선
- zoom zone merge + focus interpolation

2차 구현 추천
- cursor ripple / halo / smoothing package
- output preset (social / balanced / archive)
- export 기본값 고도화

3차 구현 추천
- smart speed / wait compression
- keystroke HUD
- preset 묶음 체계

장기 로드맵
- scriptable recording recipe
- AI agent가 시나리오를 생성하고 Auto Screen이 데모 영상을 자동 제작하는 흐름

결론
- Clipwise는 “자동화된 연출 품질” 측면에서 매우 좋은 레퍼런스다.
- Auto Screen은 GUI 중심 제품이므로 그대로 복제하지 않고,
  1) Zoom 품질
  2) Cursor 연출
  3) Output preset
  4) Smart compression
  순으로 흡수하는 것이 가장 좋다.
