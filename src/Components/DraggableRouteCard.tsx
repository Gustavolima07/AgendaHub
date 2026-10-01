import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { LayoutChangeEvent, Platform, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

type Props = {
  id: string;
  disabled: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  highlightColor: string;
  scrollAdjustment: number;
  onMeasure: (id: string, height: number) => void;
  onDragStart: (id: string) => void;
  onDragMove: (id: string, translationY: number, absoluteY: number) => void;
  onDragEnd: (id: string, translationY: number) => void;
  onDragCancel: () => void;
  children: React.ReactNode;
};

function nativeDragGesture(
  pan: ReturnType<typeof Gesture.Pan>,
  id: string,
  active: SharedValue<boolean>,
  scale: SharedValue<number>,
  translationY: SharedValue<number>,
  onDragStart: (id: string) => void,
  onDragMove: (id: string, translationY: number, absoluteY: number) => void,
  onDragEnd: (id: string, translationY: number) => void,
  onDragCancel: () => void,
) {
  return pan
    .onStart(() => {
      active.value = true;
      scale.value = withTiming(1.025, { duration: 130 });
      scheduleOnRN(onDragStart, id);
    })
    .onUpdate((event) => {
      translationY.value = event.translationY;
      scheduleOnRN(onDragMove, id, event.translationY, event.absoluteY);
    })
    .onEnd((event) => scheduleOnRN(onDragEnd, id, event.translationY))
    .onFinalize(() => {
      active.value = false;
      translationY.value = withTiming(0, { duration: 160 });
      scale.value = withTiming(1, { duration: 160 });
      scheduleOnRN(onDragCancel);
    });
}

function updateSharedOffset(offset: SharedValue<number>, value: number) {
  offset.value = value;
}

export function DraggableRouteCard({
  id,
  disabled,
  isDragging,
  isDropTarget,
  highlightColor,
  scrollAdjustment,
  onMeasure,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
  children,
}: Props) {
  const translationY = useSharedValue(0);
  const active = useSharedValue(false);
  const scale = useSharedValue(1);
  const scrollOffset = useSharedValue(0);
  const webViewRef = useRef<View>(null);
  const webTranslation = useRef(0);
  const webActive = useRef(false);
  const webOffset = useRef(0);
  const applyWebTransform = useCallback((offset: number) => {
    const element = webViewRef.current as unknown as HTMLElement | null;
    if (!element) return;
    element.style.transform = `translateY(${webTranslation.current + offset}px) scale(${webActive.current ? 1.025 : 1})`;
    element.style.zIndex = webActive.current ? '20' : '0';
  }, []);
  useEffect(() => {
    updateSharedOffset(scrollOffset, scrollAdjustment);
    webOffset.current = scrollAdjustment;
    if (Platform.OS === 'web') applyWebTransform(scrollAdjustment);
  }, [applyWebTransform, scrollAdjustment, scrollOffset]);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translationY.value + scrollOffset.value }, { scale: scale.value }],
    zIndex: active.value ? 20 : 0,
    elevation: active.value ? 10 : 0,
  }));
  const handleWebStart = useCallback(() => {
    webActive.current = true;
    applyWebTransform(webOffset.current);
    onDragStart(id);
  }, [applyWebTransform, id, onDragStart]);
  const handleWebUpdate = useCallback((event: { translationY: number; absoluteY: number }) => {
    webTranslation.current = event.translationY;
    applyWebTransform(webOffset.current);
    onDragMove(id, event.translationY, event.absoluteY);
  }, [applyWebTransform, id, onDragMove]);
  const handleWebFinalize = useCallback(() => {
    webActive.current = false;
    webTranslation.current = 0;
    applyWebTransform(0);
    onDragCancel();
  }, [applyWebTransform, onDragCancel]);
  const gesture = useMemo(() => {
    const pan = Gesture.Pan().enabled(!disabled).activateAfterLongPress(350);
    if (Platform.OS === 'web') {
      // These callbacks are registered now, but their refs are read only during a gesture.
      /* eslint-disable react-hooks/refs */
      const webGesture = pan
        .runOnJS(true)
        .onStart(handleWebStart)
        .onUpdate(handleWebUpdate)
        .onEnd((event) => onDragEnd(id, event.translationY))
        .onFinalize(handleWebFinalize);
      /* eslint-enable react-hooks/refs */
      return webGesture;
    }
    return nativeDragGesture(
      pan,
      id,
      active,
      scale,
      translationY,
      onDragStart,
      onDragMove,
      onDragEnd,
      onDragCancel,
    );
  }, [active, disabled, handleWebFinalize, handleWebStart, handleWebUpdate, id, onDragCancel, onDragEnd, onDragMove, onDragStart, scale, translationY]);

  const handleLayout = (event: LayoutChangeEvent) => {
    onMeasure(id, event.nativeEvent.layout.height);
  };

  const borderStyle = {
    borderWidth: 2,
    borderColor: isDropTarget || isDragging ? highlightColor : 'transparent',
    borderRadius: 18,
  };
  // Use React Native Web's View style path; Reanimated's DOM updater can assign invalid CSS indices.
  if (Platform.OS === 'web')
    return (
      <GestureDetector gesture={gesture}>
        <View
          ref={webViewRef}
          collapsable={false}
          onLayout={handleLayout}
          style={borderStyle}
        >
          {children}
        </View>
      </GestureDetector>
    );

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        collapsable={false}
        onLayout={handleLayout}
        style={[borderStyle, animatedStyle]}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
