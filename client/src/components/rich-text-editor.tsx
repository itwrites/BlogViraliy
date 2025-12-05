import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Typography from '@tiptap/extension-typography';
import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Highlighter,
  Palette,
  Type,
  Minus,
  Pilcrow,
  RemoveFormatting,
  Check,
  X,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const FONT_SIZES = [
  { label: 'Small', value: '14px' },
  { label: 'Normal', value: '16px' },
  { label: 'Medium', value: '18px' },
  { label: 'Large', value: '20px' },
  { label: 'X-Large', value: '24px' },
  { label: 'XX-Large', value: '32px' },
];

const TEXT_COLORS = [
  { label: 'Default', value: 'inherit' },
  { label: 'Black', value: '#000000' },
  { label: 'Gray', value: '#6b7280' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Pink', value: '#ec4899' },
];

const HIGHLIGHT_COLORS = [
  { label: 'None', value: '' },
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green', value: '#bbf7d0' },
  { label: 'Blue', value: '#bfdbfe' },
  { label: 'Purple', value: '#e9d5ff' },
  { label: 'Pink', value: '#fbcfe8' },
  { label: 'Orange', value: '#fed7aa' },
];

const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: element => element.style.fontSize || null,
        renderHTML: attributes => {
          if (!attributes.fontSize) {
            return {};
          }
          return {
            style: `font-size: ${attributes.fontSize}`,
          };
        },
      },
    };
  },
});

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing your content...',
  minHeight = '400px',
}: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imagePopoverOpen, setImagePopoverOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-lg my-4',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder,
      }),
      Highlight.configure({
        multicolor: true,
      }),
      FontSize,
      Color,
      Typography,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
        style: `min-height: ${minHeight}; padding: 1rem;`,
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  const setFontSize = useCallback((size: string) => {
    if (!editor) return;
    editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
  }, [editor]);

  const setTextColor = useCallback((color: string) => {
    if (!editor) return;
    if (color === 'inherit') {
      editor.chain().focus().unsetColor().run();
    } else {
      editor.chain().focus().setColor(color).run();
    }
  }, [editor]);

  const setHighlightColor = useCallback((color: string) => {
    if (!editor) return;
    if (!color) {
      editor.chain().focus().unsetHighlight().run();
    } else {
      editor.chain().focus().setHighlight({ color }).run();
    }
  }, [editor]);

  const addLink = useCallback(() => {
    if (!editor || !linkUrl) return;
    
    const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    setLinkUrl('');
    setLinkPopoverOpen(false);
  }, [editor, linkUrl]);

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor || !imageUrl) return;
    editor.chain().focus().setImage({ src: imageUrl }).run();
    setImageUrl('');
    setImagePopoverOpen(false);
  }, [editor, imageUrl]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-lg bg-background overflow-hidden" data-testid="rich-text-editor">
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
          data-testid="button-undo"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
          data-testid="button-redo"
        >
          <Redo className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Select onValueChange={setFontSize}>
          <SelectTrigger className="h-8 w-[100px] text-xs" data-testid="select-font-size">
            <Type className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size.value} value={size.value}>
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Button
          type="button"
          variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Heading 1"
          data-testid="button-h1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
          data-testid="button-h2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Heading 3"
          data-testid="button-h3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('paragraph') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().setParagraph().run()}
          title="Paragraph"
          data-testid="button-paragraph"
        >
          <Pilcrow className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Button
          type="button"
          variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
          data-testid="button-bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
          data-testid="button-italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline (Ctrl+U)"
          data-testid="button-underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('strike') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
          data-testid="button-strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Text Color"
              data-testid="button-text-color"
            >
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="grid grid-cols-5 gap-1">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color.value === 'inherit' ? 'transparent' : color.value }}
                  onClick={() => setTextColor(color.value)}
                  title={color.label}
                  data-testid={`button-color-${color.label.toLowerCase()}`}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive('highlight') ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              title="Highlight"
              data-testid="button-highlight"
            >
              <Highlighter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="grid grid-cols-4 gap-1">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.value || 'none'}
                  type="button"
                  className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform flex items-center justify-center"
                  style={{ backgroundColor: color.value || 'transparent' }}
                  onClick={() => setHighlightColor(color.value)}
                  title={color.label}
                  data-testid={`button-highlight-${color.label.toLowerCase()}`}
                >
                  {!color.value && <X className="h-3 w-3 text-muted-foreground" />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Button
          type="button"
          variant={editor.isActive({ textAlign: 'left' }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Align Left"
          data-testid="button-align-left"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive({ textAlign: 'center' }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Align Center"
          data-testid="button-align-center"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive({ textAlign: 'right' }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Align Right"
          data-testid="button-align-right"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive({ textAlign: 'justify' }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          title="Justify"
          data-testid="button-align-justify"
        >
          <AlignJustify className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Button
          type="button"
          variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
          data-testid="button-bullet-list"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
          data-testid="button-ordered-list"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Blockquote"
          data-testid="button-blockquote"
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('codeBlock') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Code Block"
          data-testid="button-code-block"
        >
          <Code className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
          data-testid="button-horizontal-rule"
        >
          <Minus className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive('link') ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              title="Add Link"
              data-testid="button-link"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <Input
                placeholder="Enter URL..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addLink()}
                data-testid="input-link-url"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={addLink} className="flex-1" data-testid="button-add-link">
                  <Check className="h-4 w-4 mr-1" />
                  Add
                </Button>
                {editor.isActive('link') && (
                  <Button size="sm" variant="destructive" onClick={removeLink} data-testid="button-remove-link">
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={imagePopoverOpen} onOpenChange={setImagePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Add Image"
              data-testid="button-image"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <Input
                placeholder="Enter image URL..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addImage()}
                data-testid="input-image-url"
              />
              <Button size="sm" onClick={addImage} className="w-full" data-testid="button-add-image">
                <Check className="h-4 w-4 mr-1" />
                Insert Image
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          title="Clear Formatting"
          data-testid="button-clear-formatting"
        >
          <RemoveFormatting className="h-4 w-4" />
        </Button>
      </div>

      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100 }}
          className="flex items-center gap-1 p-1 bg-popover border rounded-lg shadow-lg"
        >
          <Button
            type="button"
            variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive('link') ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => setLinkPopoverOpen(true)}
          >
            <LinkIcon className="h-3 w-3" />
          </Button>
        </BubbleMenu>
      )}

      <EditorContent editor={editor} data-testid="editor-content" />
    </div>
  );
}
