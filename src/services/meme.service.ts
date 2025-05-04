import {
    CreateMemeResponse,
    MemeCardCommentPageType,
    MemeCardCommentType,
    MemeCardType,
    MemeCommentResult,
    MemePictureText,
    MemeResult,
} from '../types/meme';
import { createMeme, getMemeComments, getMemes, getUserById } from '../api';

type PaginatedResponse<T> = {
	total: number;
	pageSize: number;
	results: T[];
};

/**
 * Creates a new meme with the provided data
 */
export async function createNewMeme(
	token: string,
	picture: File,
	description: string,
	texts: MemePictureText[]
): Promise<CreateMemeResponse> {
	const formData = new FormData();

	formData.append('Picture', picture);
	formData.append('Description', description);

	texts.forEach((text, index) => {
		formData.append(`Texts[${index}][Content]`, text.content);
		formData.append(`Texts[${index}][X]`, text.x.toString());
		formData.append(`Texts[${index}][Y]`, text.y.toString());
	});

	return createMeme(token, formData);
}

/**
 * Fetches paginated comments for a specific meme
 */
export async function fetchMemeComments(
	token: string,
	memeId: string,
	page: number
): Promise<MemeCardCommentPageType> {
	try {
		const commentPage = await getMemeComments(token, memeId, page);
		const enrichedComments = await Promise.all(
			commentPage.results.map((comment) => enrichCommentWithAuthor(token, comment))
		);
		const nextPage =
			page < Math.ceil(commentPage.total / commentPage.pageSize) ? page + 1 : undefined;
		return { comments: enrichedComments, nextPage };
	} catch (error) {
		throw new Error(`Failed to fetch comments for meme ${memeId}: ${error}`);
	}
}

/**
 * Enriches a comment with its author's information
 */
export async function enrichCommentWithAuthor(
	token: string,
	comment: MemeCommentResult
): Promise<MemeCardCommentType> {
	try {
		const author = await getUserById(token, comment.authorId);
		return { ...comment, author };
	} catch (error) {
		throw new Error(`Failed to fetch author for comment ${comment.id}: ${error}`);
	}
}

/**
 * Enriches meme data with author information and converts types
 */
async function enrichMemeWithAuthor(token: string, meme: MemeResult): Promise<MemeCardType> {
	try {
		const author = await getUserById(token, meme.authorId);
		return {
			...meme,
			author,
			commentsCount: parseInt(meme.commentsCount),
		};
	} catch (error) {
		throw new Error(`Failed to fetch author for meme ${meme.id}: ${error}`);
	}
}

/**
 * Fetches paginated memes with enriched author information
 */
export async function fetchMemes(
	token: string,
	page: number = 1
): Promise<PaginatedResponse<MemeCardType>> {
	try {
		const memePage = await getMemes(token, page);
		const enrichedMemes = await Promise.all(
			memePage.results.map((meme) => enrichMemeWithAuthor(token, meme))
		);
		return { ...memePage, results: enrichedMemes };
	} catch (error) {
		throw new Error(`Failed to fetch memes: ${error}`);
	}
}
