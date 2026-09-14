import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Not Found",
};

export default function ProjectNotFound() {
  return (
    <div>
      <h2>Project not found</h2>
      <p>This project does not exist or you do not have access.</p>
    </div>
  );
}
