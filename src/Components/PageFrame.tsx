import React, { createContext, useContext, useMemo, useRef } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { PageEntrance, ThemedText } from '../ui';
import { navigation, tabSubtitles, NavId } from '../Router/navigation';

type PageScrollController = {
  getOffset: () => number;
  getViewport: () => { top: number; bottom: number };
  scrollBy: (distance: number) => number;
};

const PageScrollContext = createContext<PageScrollController | null>(null);
export const usePageScroll = () => useContext(PageScrollContext);

export function PageFrame({ id, children }: { id: NavId | 'help'; children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const page = navigation.find((item) => item.id === id);
  const scrollRef = useRef<ScrollView>(null);
  const offset = useRef(0);
  const contentHeight = useRef(0);
  const viewport = useRef({ top: 0, bottom: 0 });
  const scrollController = useMemo<PageScrollController>(
    () => ({
      getOffset: () => offset.current,
      getViewport: () => viewport.current,
      scrollBy: (distance) => {
        const height = viewport.current.bottom - viewport.current.top;
        const maxOffset = Math.max(0, contentHeight.current - height);
        const next = Math.max(0, Math.min(maxOffset, offset.current + distance));
        const moved = next - offset.current;
        if (moved) {
          offset.current = next;
          scrollRef.current?.scrollTo({ y: next, animated: false });
        }
        return moved;
      },
    }),
    [],
  );

  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      onScroll={(event) => {
        offset.current = event.nativeEvent.contentOffset.y;
      }}
      onContentSizeChange={(_, height) => {
        contentHeight.current = height;
      }}
      onLayout={(event) => {
        const height = event.nativeEvent.layout.height;
        viewport.current = { top: 0, bottom: height };
        scrollRef.current?.getNativeScrollRef()?.measureInWindow((_, top) => {
          viewport.current = { top, bottom: top + height };
        });
      }}
      contentContainerStyle={{ padding: width >= 900 ? 32 : 18, paddingBottom: 40 }}
    >
      <PageScrollContext.Provider value={scrollController}>
        <View style={{ width: '100%', maxWidth: 1350, alignSelf: 'center', gap: 22 }}>
          {id !== 'dashboard' && (
            <View>
              <ThemedText size={29} bold>
                {page?.label || 'Central de ajuda'}
              </ThemedText>
              <ThemedText muted>
                {id === 'help'
                  ? 'Encontre orienta\u00e7\u00f5es para cada recurso do aplicativo.'
                  : tabSubtitles[id]}
              </ThemedText>
            </View>
          )}
          <PageEntrance>{children}</PageEntrance>
        </View>
      </PageScrollContext.Provider>
    </ScrollView>
  );
}
