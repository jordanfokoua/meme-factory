import {
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  Icon,
  IconButton,
  Input,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Textarea,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Trash } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { MemeEditor } from "../../components/meme-editor";
import { MemePictureProps } from "../../components/meme-picture";
import { createNewMeme } from "../../services/meme.service";
import { useAuthToken } from "../../contexts/authentication";

export const Route = createFileRoute("/_authentication/create")({
  component: CreateMemePage,
});

type Picture = {
  url: string;
  file: File;
};

function CreateMemePage() {
  const [picture, setPicture] = useState<Picture | null>(null);
  const [texts, setTexts] = useState<MemePictureProps["texts"]>([]);
  const [description, setDescription] = useState("");
  const [selectedCaptionIndex, setSelectedCaptionIndex] = useState<number | null>(null);
  const navigate = useNavigate();
  const toast = useToast();
  const token = useAuthToken();

  const handleDrop = (file: File) => {
    setPicture({
      url: URL.createObjectURL(file),
      file,
    });
  };

  const handleAddCaptionButtonClick = () => {
    setTexts([
      ...texts,
      {
        content: `New caption ${texts.length + 1}`,
        x: Math.trunc(Math.random() * 400),
        y: Math.trunc(Math.random() * 225),
      },
    ]);
  };

  const handleDeleteCaptionButtonClick = (index: number) => {
    setTexts(texts.filter((_, i) => i !== index));
  };

  const handleCaptionChange = (index: number, newContent: string) => {
    const newTexts = [...texts];
    newTexts[index] = { ...newTexts[index], content: newContent };
    setTexts(newTexts);
  };

  const handleCaptionClick = (index: number) => {
    setSelectedCaptionIndex(index);
  };

  const handlePositionChange = (axis: 'x' | 'y', value: number) => {
    if (selectedCaptionIndex === null) return;
    
    const newTexts = [...texts];
    newTexts[selectedCaptionIndex] = {
      ...newTexts[selectedCaptionIndex],
      [axis]: value,
    };
    setTexts(newTexts);
  };

  const memePicture = useMemo(() => {
    if (!picture) {
      return undefined;
    }

    return {
      pictureUrl: picture.url,
      texts,
      selectedIndex: selectedCaptionIndex,
      onCaptionClick: handleCaptionClick,
    };
  }, [picture, texts, selectedCaptionIndex]);

  const handleSubmit = async () => {
    if (!picture) return;

    try {
      await createNewMeme(token, picture.file, description, texts);
      toast({
        title: "Meme created successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      navigate({ to: "/" });
    } catch (error) {
      toast({
        title: "Failed to create meme",
        description: "Please try again later",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Flex width="full" height="full">
      <Box flexGrow={1} height="full" p={4} overflowY="auto">
        <VStack spacing={5} align="stretch">
          <Box>
            <Heading as="h2" size="md" mb={2}>
              Upload your picture
            </Heading>
            <MemeEditor onDrop={handleDrop} memePicture={memePicture} />
            {selectedCaptionIndex !== null && (
              <Box mt={4} p={4} borderWidth="1px" borderRadius="md">
                <Heading as="h3" size="sm" mb={4}>
                  Position Controls
                </Heading>
                <VStack spacing={4}>
                  <Box width="full">
                    <Heading as="h4" size="xs" mb={2}>
                      X Position
                    </Heading>
                    <Slider
                      value={texts[selectedCaptionIndex].x}
                      min={0}
                      max={800}
                      onChange={(value) => handlePositionChange('x', value)}
                    >
                      <SliderTrack>
                        <SliderFilledTrack />
                      </SliderTrack>
                      <SliderThumb />
                    </Slider>
                  </Box>
                  <Box width="full">
                    <Heading as="h4" size="xs" mb={2}>
                      Y Position
                    </Heading>
                    <Slider
                      value={texts[selectedCaptionIndex].y}
                      min={0}
                      max={450}
                      onChange={(value) => handlePositionChange('y', value)}
                    >
                      <SliderTrack>
                        <SliderFilledTrack />
                      </SliderTrack>
                      <SliderThumb />
                    </Slider>
                  </Box>
                </VStack>
              </Box>
            )}
          </Box>
          <Box>
            <Heading as="h2" size="md" mb={2}>
              Describe your meme
            </Heading>
            <Textarea 
              placeholder="Type your description here..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Box>
        </VStack>
      </Box>
      <Flex
        flexDir="column"
        width="30%"
        minW="250"
        height="full"
        boxShadow="lg"
      >
        <Heading as="h2" size="md" mb={2} p={4}>
          Add your captions
        </Heading>
        <Box p={4} flexGrow={1} height={0} overflowY="auto">
          <VStack>
            {texts.map((text, index) => (
              <Flex key={index} width="full">
                <Input 
                 
                  value={text.content} 
                  onChange={(e) => handleCaptionChange(index, e.target.value)}
                  mr={1} 
                />
                <IconButton
                  onClick={() => handleDeleteCaptionButtonClick(index)}
                  aria-label="Delete caption"
                  icon={<Icon as={Trash} />}
                />
              </Flex>
            ))}
            <Button
              colorScheme="cyan"
              leftIcon={<Icon as={Plus} />}
              variant="ghost"
              size="sm"
              width="full"
              onClick={handleAddCaptionButtonClick}
              isDisabled={memePicture === undefined}
            >
              Add a caption
            </Button>
          </VStack>
        </Box>
        <HStack p={4}>
          <Button
            as={Link}
            to="/"
            colorScheme="cyan"
            variant="outline"
            size="sm"
            width="full"
          >
            Cancel
          </Button>
          <Button
            colorScheme="cyan"
            size="sm"
            width="full"
            color="white"
            isDisabled={memePicture === undefined || !description}
            onClick={handleSubmit}
          >
            Submit
          </Button>
        </HStack>
      </Flex>
    </Flex>
  );
}
