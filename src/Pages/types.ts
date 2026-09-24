import { Editor } from '../Components/EditorSheet';

export type PageProps = {
  edit: (e: Editor) => void;
  notify: (s: string) => void;
  go?: (s: string) => void;
};
