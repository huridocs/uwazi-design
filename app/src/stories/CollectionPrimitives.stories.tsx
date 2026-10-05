import type { Meta, StoryObj } from "@storybook/react-vite";
import { DateInputDemo, ImagePickerModalDemo, MapPointPickerDemo } from "../views/catalog/collectionDemos";

/** The controls Settings › Collection adds: a date field in the collection's
 *  format, a map that places one point, and the upload image picker. Each
 *  story is the live catalog demo. */
const meta = {
  title: "Settings/Collection controls",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const DateInput: Story = { render: () => <DateInputDemo /> };
export const MapPointPicker: Story = { render: () => <MapPointPickerDemo /> };
export const ImagePickerModal: Story = { render: () => <ImagePickerModalDemo /> };
