import { GetUserByIdResponse, getMemes, getUserById } from '../../api';

import { Feed } from '../../components/feed';
import { Loader } from '../../components/loader';
import { MemeCard } from '../../components/meme-card';
import { StackDivider } from '@chakra-ui/react';
import { createFileRoute } from '@tanstack/react-router';
import { useAuthToken } from '../../contexts/authentication';

const userCache = new Map<string, GetUserByIdResponse>();

export const MemeFeedPage: React.FC = () => {
	const token = useAuthToken();

	const fetchMemes = async (pageParam: number) => {
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
			items: page.results.map((meme) => ({
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
	};

	return (
		<Feed
			queryKey={['memes', token]}
			queryFn={fetchMemes}
			renderItem={(meme) => <MemeCard meme={meme} />}
			loadingState={<Loader data-testid="meme-feed-loader" />}
			containerProps={{ p: 4, width: 'full', maxWidth: 800, divider: <StackDivider border="gray.200" /> }}
		/>
	);
};

export const Route = createFileRoute('/_authentication/')({
	component: MemeFeedPage,
});
