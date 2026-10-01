import React, { useEffect, useMemo, useState } from 'react';
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
  onMeasure: (id: string, y: number, height: number) => void;
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
  useEffect(() => {
    updateSharedOffset(scrollOffset, scrollAdjustment);
  }, [scrollAdjustment, scrollOffset]);
  const [webTranslationY, setWebTranslationY] = useState(0);
  const [webActive, setWebActive] = useState(false);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translationY.value + scrollOffset.value }, { scale: scale.value }],
    zIndex: active.value ? 20 : 0,
    elevation: active.value ? 10 : 0,
  }));
  const gesture = useMemo(() => {
    const pan = Gesture.Pan().enabled(!disabled).activateAfterLongPress(350);
    if (Platform.OS === 'web')
      return pan
        .runOnJS(true)
        .onStart(() => {
          setWebActive(true);
          onDragStart(id);
        })
        .onUpdate((event) => {
          setWebTranslationY(event.translationY);
          onDragMove(id, event.translationY, event.absoluteY);
        })
        .onEnd((event) => onDragEnd(id, event.translationY))
        .onFinalize(() => {
          setWebActive(false);
          setWebTranslationY(0);
          onDragCancel();
        });
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
  }, [active, disabled, id, onDragCancel, onDragEnd, onDragMove, onDragStart, scale, translationY]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    onMeasure(id, y, height);
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
          collapsable={false}
          onLayout={handleLayout}
          style={[
            borderStyle,
            {
              transform: [
                { translateY: webTranslationY + scrollAdjustment },
                { scale: webActive ? 1.025 : 1 },
              ],
              zIndex: webActive ? 20 : 0,
            },
          ]}
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
