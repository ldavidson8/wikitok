import { Stack } from 'expo-router';

export default function WebLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="article"
        options={{
          title: 'Article',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
