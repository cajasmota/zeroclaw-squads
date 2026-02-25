// Mock for Tiptap and lowlight ESM packages
// These are mocked in tests to avoid ESM transform issues

const mockEditor = {
  chain: () => mockEditor,
  focus: () => mockEditor,
  run: jest.fn(),
  isActive: jest.fn().mockReturnValue(false),
  commands: {
    setContent: jest.fn(),
    setImage: jest.fn(),
  },
  getJSON: jest.fn().mockReturnValue({}),
  on: jest.fn(),
  off: jest.fn(),
  destroy: jest.fn(),
  toggleBold: () => mockEditor,
  toggleItalic: () => mockEditor,
  toggleCode: () => mockEditor,
  toggleHeading: () => mockEditor,
  toggleBulletList: () => mockEditor,
  toggleOrderedList: () => mockEditor,
  toggleCodeBlock: () => mockEditor,
  insertTable: () => mockEditor,
  setImage: () => mockEditor,
};

module.exports = {
  useEditor: jest.fn().mockReturnValue(mockEditor),
  EditorContent: () => null,
  StarterKit: {},
  Table: { configure: jest.fn().mockReturnValue({}) },
  TableRow: {},
  TableCell: {},
  TableHeader: {},
  createLowlight: jest.fn().mockReturnValue({}),
  common: {},
  all: {},
  grammars: {},
  default: {},
};
