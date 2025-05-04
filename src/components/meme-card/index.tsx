import { Avatar, Box, Flex, Text, VStack } from '@chakra-ui/react';

import { CommentSection } from '../comment-section';
import { GetUserByIdResponse } from '../../api';
import { MemePicture } from '../meme-picture';
import { format } from 'timeago.js';

type Meme = {
	id: string;
	description: string;
	pictureUrl: string;
	texts: { content: string; x: number; y: number }[];
	author: GetUserByIdResponse;
	commentsCount: number;
	createdAt: string;
};

type MemeCardProps = {
	meme: Meme;
};

export const MemeCard: React.FC<MemeCardProps> = ({ meme }) => {
	return (
		<VStack p={4} width="full" align="stretch">
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
			<CommentSection memeId={meme.id} commentsCount={meme.commentsCount} />
		</VStack>
	);
}; 