import {
	Avatar,
	Box,
	Button,
	Collapse,
	Flex,
	Icon,
	Input,
	LinkBox,
	LinkOverlay,
	Text,
	VStack,
} from '@chakra-ui/react';
import { CaretDown, CaretUp, Chat } from '@phosphor-icons/react';
import { createMemeComment, getMemeComments, getUserById } from '../../api';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';

import { GetUserByIdResponse } from '../../api';
import { format } from 'timeago.js';
import { jwtDecode } from 'jwt-decode';
import { useAuthToken } from '../../contexts/authentication';
import { useState } from 'react';

const userCache = new Map<string, GetUserByIdResponse>();

type Comment = {
	id: string;
	content: string;
	author: GetUserByIdResponse;
	createdAt: string;
};

type CommentPage = {
	comments: Comment[];
	nextPage: number | undefined;
};

type CommentSectionProps = {
	memeId: string;
	commentsCount: number;
};

export const CommentSection: React.FC<CommentSectionProps> = ({ memeId, commentsCount }) => {
	const token = useAuthToken();
	const [isOpen, setIsOpen] = useState(false);
	const [commentContent, setCommentContent] = useState('');

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

	const {
		data: commentsData,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useInfiniteQuery<CommentPage, Error, { pages: CommentPage[]; pageParams: number[] }, string[], number>({
		queryKey: ['comments', memeId, token],
		queryFn: async ({ pageParam = 1 }) => {
			if (!isOpen || commentsCount === 0) return { comments: [], nextPage: undefined };

			const page = await getMemeComments(token, memeId, pageParam);
			const comments = page.results;

			const authorIds = [...new Set(comments.map((comment) => comment.authorId))];

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
				comments: comments.map((comment) => ({
					...comment,
					author: authorMap.get(comment.authorId)!,
				})),
				nextPage: pageParam < Math.ceil(page.total / page.pageSize) ? pageParam + 1 : undefined,
			};
		},
		getNextPageParam: (lastPage) => lastPage.nextPage,
		initialPageParam: 1,
		enabled: isOpen && commentsCount > 0,
	});

	const { mutate } = useMutation({
		mutationFn: async (content: string) => {
			await createMemeComment(token, memeId, content);
		},
		onSuccess: () => {
			setCommentContent('');
		},
	});

	const handleToggleComments = () => {
		setIsOpen((prev) => !prev);
	};

	const comments = commentsData?.pages.flatMap((page: CommentPage) => page.comments) ?? [];

	return (
		<>
			<LinkBox as={Box} py={2} borderBottom="1px solid black">
				<Flex justifyContent="space-between" alignItems="center">
					<Flex alignItems="center">
						<LinkOverlay
							data-testid={`meme-comments-section-${memeId}`}
							cursor="pointer"
							onClick={handleToggleComments}
						>
							<Text data-testid={`meme-comments-count-${memeId}`}>{commentsCount} comments</Text>
						</LinkOverlay>
						{commentsCount > 0 && <Icon as={isOpen ? CaretUp : CaretDown} ml={2} mt={1} />}
					</Flex>
					<Icon as={Chat} />
				</Flex>
			</LinkBox>
			<Collapse in={isOpen} animateOpacity>
				<Box mb={6}>
					<form
						onSubmit={(event) => {
							event.preventDefault();
							if (commentContent) {
								mutate(commentContent);
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
								onChange={(event) => setCommentContent(event.target.value)}
								value={commentContent}
							/>
						</Flex>
					</form>
				</Box>
				<VStack align="stretch" spacing={4}>
					{comments.map((comment: Comment) => (
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
										<Text data-testid={`meme-comment-author-${memeId}-${comment.id}`}>
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
									data-testid={`meme-comment-content-${memeId}-${comment.id}`}
								>
									{comment.content}
								</Text>
							</Box>
						</Flex>
					))}
					{hasNextPage && (
						<Button
							onClick={() => fetchNextPage()}
							isLoading={isFetchingNextPage}
							variant="ghost"
							size="sm"
							alignSelf="center"
						>
							Load More Comments
						</Button>
					)}
				</VStack>
			</Collapse>
		</>
	);
};
