import { Tweet as ReactTweet } from "react-tweet";

export function Tweet({ id }: { id: string }) {
  return (
    <div className="not-prose my-8 flex justify-center">
      <ReactTweet id={id} />
    </div>
  );
}
