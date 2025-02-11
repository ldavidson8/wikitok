import { Stack } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';

export default function WebLayout() {
  const { title } = useLocalSearchParams<{ title: string }>();
  return (
    <Stack>
      <Stack.Screen
        name="article"
        options={{
          title: title || 'Article',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
