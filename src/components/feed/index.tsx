import { Box, Flex, Spinner, VStack } from '@chakra-ui/react';
import { useCallback, useEffect, useRef } from 'react';

import { useInfiniteQuery } from '@tanstack/react-query';

export type Page<T> = {
  items: T[];
  nextPage: number | undefined;
};

export type InfiniteData<T> = {
  pages: Page<T>[];
  pageParams: number[];
};

type FeedProps<T> = {
  queryKey: string[];
  queryFn: (pageParam: number) => Promise<Page<T>>;
  renderItem: (item: T) => React.ReactNode;
  emptyState?: React.ReactNode;
  loadingState?: React.ReactNode;
  containerProps?: React.ComponentProps<typeof VStack>;
};

export const Feed = <T,>({
  queryKey,
  queryFn,
  renderItem,
  emptyState,
  loadingState,
  containerProps,
}: FeedProps<T>) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery<
    Page<T>,
    Error,
    InfiniteData<T>,
    string[],
    number
  >({
    queryKey,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => queryFn(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    if (isNearBottom && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (isLoading) {
    return loadingState ? (
      <>{loadingState}</>
    ) : (
      <Flex justify="center" p={4}>
        <Spinner />
      </Flex>
    );
  }

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <Flex ref={containerRef} width="full" height="full" justifyContent="center" overflowY="auto">
      <VStack width="full" maxWidth={800} {...containerProps}>
        {items.map((item) => renderItem(item))}
        {isFetchingNextPage && (
          <Flex justify="center" p={4}>
            <Spinner />
          </Flex>
        )}
      </VStack>
    </Flex>
  );
}; 