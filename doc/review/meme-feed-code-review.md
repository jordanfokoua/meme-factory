# Meme feed code review

## Observed issues

The meme feed was initially extremely slow, blocking the UI and resulting in a poor user experience. The root cause was a mix of **serial API requests**, **unscalable logic**, and **no lazy loading**.

Network analysis revealed that the application was making hundreds of synchronous API calls, completely blocking the feed from being displayed. Only by disabling the "remaining pages" functionality could the first page of the feed become visible.

Additionally, the feed was experiencing unnecessary rerenders. While feed updates are necessary when new data is fetched, the implementation was triggering rerenders even when there were no actual changes to the feed content.

## Solution overview

The refactoring approach follows a systematic progression:

1. **Code structure and readability**

   - Break down the monolithic feed code into smaller, focused components
   - Implement clear separation of concerns
   - Improve code organization and maintainability

2. **Core functionality**

   - Make the feed usable with basic features
   - Implement proper error handling
   - Ensure stable rendering and interaction

3. **Scalability**

   - Design for future growth and feature additions
   - Implement proper state management
   - Create reusable components and utilities

4. **Performance optimization**

   - Address minor performance issues
   - Optimize existing UI components
   - Implement efficient data fetching strategies

### Key technical improvements

- **Asynchronous API calls**

  - Convert synchronous calls to asynchronous operations
  - Implement proper handling of sequential and concurrent API requests
  - Add error handling and retry mechanisms

- **Pagination implementation**

  - Load only the first page initially
  - Implement infinite scroll for subsequent pages
  - Add loading states and error handling for pagination

## Root causes

### 1. **Serial API calls**

- Fetched **all meme pages sequentially**.
- For each meme:
  - Fetched author info separately
  - Fetched all comment pages
  - For each comment, fetched author info again

This resulted in potentially **hundreds of sequential requests** on initial load.

### 2. **Blocking UI**

- All of the above was awaited before rendering anything.
- The user was left staring at a loader until everything was fetched.

### 3. **No lazy loading**

- Comments and authors were fetched for all memes, even if they weren't visible.

### 4. **Redundant user fetches**

- The same user (author of memes/comments) was often fetched multiple times.
- There was no caching or memoization of user data.

## Improvements in the current implementation

### Component architecture

- **Modular components**

  - Split the monolithic feed into smaller, focused components
  - Created separate components for:

    - Feed container and pagination logic
    - Individual meme cards
    - Comment sections

  - Improved code maintainability and reusability

### `useInfiniteQuery` for paginated memes

- The meme feed now uses **incremental loading**, improving TTFB (time to first byte).
- Additional pages are fetched as the user scrolls near the bottom.

### Parallel fetching with `Promise.all`

- Meme authors are fetched in parallel per page.
- Authors are cached in-memory with a `Map` to avoid duplicate requests.

### Lazy-loaded comments

- Comments are only fetched **when a meme's comment section is opened**.
- Comments are fetched in parallel by page.

### Caching strategy

- A global `Map<string, GetUserByIdResponse>` is used to cache any fetched user.
- Reduces unnecessary network requests and speeds up render.

## Result

| Before | After (Optimized) |
| 100+ serial API calls | Batched + parallel fetches |
| Full page blocked | First meme page loads instantly |
| Comments always fetched | Fetched on-demand (lazy) |
| Duplicate user fetches | Memoized per session |

## Further improvements

- Implement error boundaries and fallback UI components for better error handling and user experience
- Request backend support for embedded author objects and implement WebSocket for real-time updates
- Add unit tests and add performance monitoring for better code quality

## TL;DR summary

The previous feed had critical performance issues due to deeply nested, sequential API calls. The updated version now fetches in pages, lazily loads heavy data (like comments), and caches shared data efficiently. This dramatically improves responsiveness and scalability while keeping the code modular and maintainable.
