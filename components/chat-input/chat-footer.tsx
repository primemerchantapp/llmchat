import { Flex, Type } from "@/ui";

export const ChatFooter = () => {
  return (
    <Flex className="w-full px-4 py-1" justify="center" gap="xs">
      <Type
        size="xxs"
        textColor="tertiary"
        className="inline-block text-center"
      >
        aiConnect by Emilio LLM
      </Type>
    </Flex>
  );
};