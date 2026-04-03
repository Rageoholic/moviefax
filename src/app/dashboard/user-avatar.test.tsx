import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

import { UserAvatar } from "./user-avatar";

vi.mock("next/image", () => ({
	default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
		// biome-ignore lint/performance/noImgElement: intentional in test mock
		// biome-ignore lint/a11y/useAltText: alt is always passed through props
		<img {...props} />
	),
}));

describe("UserAvatar", () => {
	it("renders the profile image when src is provided", () => {
		render(
			<UserAvatar name="Ada Lovelace" src="https://example.com/ada.jpg" />,
		);
		const img = screen.getByRole("img");
		expect(img).toBeDefined();
		expect((img as HTMLImageElement).src).toBe("https://example.com/ada.jpg");
	});

	it("renders the initial fallback when src is null", () => {
		render(<UserAvatar name="Ada Lovelace" src={null} />);
		expect(screen.queryByRole("img")).toBeNull();
		expect(screen.getByText("A")).toBeDefined();
	});

	it("falls back to the initial when the image errors", () => {
		render(
			<UserAvatar name="Ada Lovelace" src="https://example.com/broken.jpg" />,
		);
		const img = screen.getByRole("img");
		fireEvent.error(img);
		expect(screen.queryByRole("img")).toBeNull();
		expect(screen.getByText("A")).toBeDefined();
	});

	it("shows '?' when src is null and name is null", () => {
		render(<UserAvatar name={null} src={null} />);
		expect(screen.getByText("?")).toBeDefined();
	});
});
