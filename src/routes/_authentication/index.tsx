import {
	Avatar,
	Box,
	Collapse,
	Flex,
	Icon,
	Input,
	LinkBox,
	LinkOverlay,
	Spinner,
	StackDivider,
	Text,
	VStack,
} from '@chakra-ui/react';
import { CaretDown, CaretUp, Chat } from '@phosphor-icons/react';
import { GetMemeCommentsResponse, GetMemesResponse } from '../../api';
import {
	GetUserByIdResponse,
	createMemeComment,
	getMemeComments,
	getMemes,
	getUserById,
} from '../../api';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';

import { Loader } from '../../components/loader';
import { MemePicture } from '../../components/meme-picture';
import { createFileRoute } from '@tanstack/react-router';
import { format } from 'timeago.js';
import { jwtDecode } from 'jwt-decode';
import { useAuthToken } from '../../contexts/authentication';

const userCache = new Map<string, GetUserByIdResponse>();

type Meme = {
	id: string;
	description: string;
	pictureUrl: string;
	texts: { content: string; x: number; y: number }[];
	author: GetUserByIdResponse;
	commentsCount: number;
	createdAt: string;
};

type MemePage = {
	memes: Meme[];
	nextPage: number | undefined;
};

type InfiniteMemeData = {
	pages: MemePage[];
	pageParams: number[];
};

export const MemeFeedPage: React.FC = () => {
	const token = useAuthToken();
	const [openedCommentSection, setOpenedCommentSection] = useState<string | null>(null);
	const [commentContent, setCommentContent] = useState<{ [key: string]: string }>({});
	const containerRef = useRef<HTMLDivElement>(null);

	const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery<
		MemePage,
		Error,
		InfiniteMemeData,
		string[],
		number
	>({
		queryKey: ['memes', token],
		initialPageParam: 1,
		queryFn: async ({ pageParam }: { pageParam: number }) => {
			const page = await getMemes(token, pageParam);

			const authorIds = [...new Set(page.results.map((meme) => meme.authorId))];

			const authorPromises = authorIds.map((id) => {
				if (userCache.has(id)) {
					return Promise.resolve(userCache.get(id)!);
				}
				return getUserById(token, id).then((author) => {
					userCache.set(id, author);
					return author;
				});
			});
			const authors = await Promise.all(authorPromises);

			const authorMap = new Map(authors.map((author) => [author.id, author]));

			return {
				memes: page.results.map((meme) => ({
					id: meme.id,
					description: meme.description,
					pictureUrl: meme.pictureUrl,
					texts: meme.texts,
					author: authorMap.get(meme.authorId)!,
					commentsCount: parseInt(meme.commentsCount),
					createdAt: meme.createdAt,
				})),
				nextPage: pageParam < Math.ceil(page.total / page.pageSize) ? pageParam + 1 : undefined,
			};
		},
		getNextPageParam: (lastPage) => lastPage.nextPage,
	});

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const handleScroll = () => {
			const { scrollTop, scrollHeight, clientHeight } = container;
			const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

			if (isNearBottom && hasNextPage && !isFetchingNextPage) {
				fetchNextPage();
			}
		};

		container.addEventListener('scroll', handleScroll);
		return () => container.removeEventListener('scroll', handleScroll);
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	const { data: user } = useQuery({
		queryKey: ['user', token],
		queryFn: async () => {
			const userId = jwtDecode<{ id: string }>(token).id;
			if (userCache.has(userId)) {
				return userCache.get(userId)!;
			}
			const userData = await getUserById(token, userId);
			userCache.set(userId, userData);
			return userData;
		},
	});

	const { data: comments } = useQuery({
		queryKey: ['comments', openedCommentSection, token],
		queryFn: async () => {
			if (!openedCommentSection) return null;

			const firstPage = await getMemeComments(token, openedCommentSection, 1);
			const totalPages = Math.ceil(firstPage.total / firstPage.pageSize);

			const pagePromises = Array.from({ length: totalPages }, (_, i) =>
				getMemeComments(token, openedCommentSection, i + 1)
			);
			const pages = await Promise.all(pagePromises);

			const allComments = pages.flatMap((page) => page.results);

			const authorIds = [...new Set(allComments.map((comment) => comment.authorId))];

			const authorPromises = authorIds.map((id) => {
				if (userCache.has(id)) {
					return Promise.resolve(userCache.get(id)!);
				}
				return getUserById(token, id).then((author) => {
					userCache.set(id, author);
					return author;
				});
			});
			const authors = await Promise.all(authorPromises);

			const authorMap = new Map(authors.map((author) => [author.id, author]));

			return allComments.map((comment) => ({
				...comment,
				author: authorMap.get(comment.authorId)!,
			}));
		},
		enabled: !!openedCommentSection,
	});

	const { mutate } = useMutation({
		mutationFn: async (data: { memeId: string; content: string }) => {
			await createMemeComment(token, data.memeId, data.content);
		},
	});

	if (isLoading) {
		return <Loader data-testid="meme-feed-loader" />;
	}

	const memes = data?.pages.flatMap((page: MemePage) => page.memes) ?? [];

	return (
		<Flex ref={containerRef} width="full" height="full" justifyContent="center" overflowY="auto">
			<VStack p={4} width="full" maxWidth={800} divider={<StackDivider border="gray.200" />}>
				{memes.map((meme: Meme, index: number) => {
					return (
						<VStack key={meme.id} p={4} width="full" align="stretch">
							<Flex justifyContent="space-between" alignItems="center">
								<Flex>
									<Avatar
										borderWidth="1px"
										borderColor="gray.300"
										size="xs"
										name={meme.author.username}
										src={meme.author.pictureUrl}
									/>
									<Text ml={2} data-testid={`meme-author-${meme.id}`}>
										{meme.author.username}
									</Text>
								</Flex>
								<Text fontStyle="italic" color="gray.500" fontSize="small">
									{format(meme.createdAt)}
								</Text>
							</Flex>
							<MemePicture
								pictureUrl={meme.pictureUrl}
								texts={meme.texts}
								dataTestId={`meme-picture-${meme.id}`}
							/>
							<Box>
								<Text fontWeight="bold" fontSize="medium" mb={2}>
									Description:{' '}
								</Text>
								<Box p={2} borderRadius={8} border="1px solid" borderColor="gray.100">
									<Text
										color="gray.500"
										whiteSpace="pre-line"
										data-testid={`meme-description-${meme.id}`}
									>
										{meme.description}
									</Text>
								</Box>
							</Box>
							<LinkBox as={Box} py={2} borderBottom="1px solid black">
								<Flex justifyContent="space-between" alignItems="center">
									<Flex alignItems="center">
										<LinkOverlay
											data-testid={`meme-comments-section-${meme.id}`}
											cursor="pointer"
											onClick={() =>
												setOpenedCommentSection(openedCommentSection === meme.id ? null : meme.id)
											}
										>
											<Text data-testid={`meme-comments-count-${meme.id}`}>
												{meme.commentsCount} comments
											</Text>
										</LinkOverlay>
										<Icon
											as={openedCommentSection !== meme.id ? CaretDown : CaretUp}
											ml={2}
											mt={1}
										/>
									</Flex>
									<Icon as={Chat} />
								</Flex>
							</LinkBox>
							<Collapse in={openedCommentSection === meme.id} animateOpacity>
								<Box mb={6}>
									<form
										onSubmit={(event) => {
											event.preventDefault();
											if (commentContent[meme.id]) {
												mutate({
													memeId: meme.id,
													content: commentContent[meme.id],
												});
											}
										}}
									>
										<Flex alignItems="center">
											<Avatar
												borderWidth="1px"
												borderColor="gray.300"
												name={user?.username}
												src={user?.pictureUrl}
												size="sm"
												mr={2}
											/>
											<Input
												placeholder="Type your comment here..."
												onChange={(event) => {
													setCommentContent({
														...commentContent,
														[meme.id]: event.target.value,
													});
												}}
												value={commentContent[meme.id]}
											/>
										</Flex>
									</form>
								</Box>
								<VStack align="stretch" spacing={4}>
									{comments?.map((comment) => (
										<Flex key={comment.id}>
											<Avatar
												borderWidth="1px"
												borderColor="gray.300"
												size="sm"
												name={comment.author.username}
												src={comment.author.pictureUrl}
												mr={2}
											/>
											<Box p={2} borderRadius={8} bg="gray.50" flexGrow={1}>
												<Flex justifyContent="space-between" alignItems="center">
													<Flex>
														<Text data-testid={`meme-comment-author-${meme.id}-${comment.id}`}>
															{comment.author.username}
														</Text>
													</Flex>
													<Text fontStyle="italic" color="gray.500" fontSize="small">
														{format(comment.createdAt)}
													</Text>
												</Flex>
												<Text
													color="gray.500"
													whiteSpace="pre-line"
													data-testid={`meme-comment-content-${meme.id}-${comment.id}`}
												>
													{comment.content}
												</Text>
											</Box>
										</Flex>
									))}
								</VStack>
							</Collapse>
						</VStack>
					);
				})}
				{isFetchingNextPage && (
					<Flex justify="center" p={4}>
						<Spinner />
					</Flex>
				)}
			</VStack>
		</Flex>
	);
};

export const Route = createFileRoute('/_authentication/')({
	component: MemeFeedPage,
});
