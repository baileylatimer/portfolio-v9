import { LoaderFunction } from "@remix-run/node";
import ProjectPage from './$slug';

export const loader: LoaderFunction = async ({ params }) => {
  // The loader from $slug.tsx will handle the data fetching
  return null;
};

export default ProjectPage;