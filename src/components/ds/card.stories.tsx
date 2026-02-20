import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ds";

const meta = {
  title: "DS/Carte",
  component: Card,
  tags: ["autodocs"],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Defaut: Story = {
  render: () => (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Routine du soir</CardTitle>
        <CardDescription>Carte glassmorphism avec hiérarchie visuelle douce.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-secondary">Lecture, douche puis préparation du sac.</p>
      </CardContent>
    </Card>
  ),
};

export const Interactive: Story = {
  render: () => (
    <Card interactive className="max-w-md cursor-pointer">
      <CardHeader>
        <CardTitle>Carte interactive</CardTitle>
        <CardDescription>Survol subtil avec ombre renforcée.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-secondary">Idéale pour les listes de tâches cliquables.</p>
      </CardContent>
    </Card>
  ),
};

export const ModeSombre: Story = {
  parameters: {
    globals: {
      theme: "dark",
    },
  },
  render: Defaut.render!,
};
