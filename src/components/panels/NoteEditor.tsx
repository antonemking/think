'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import {
  ArrowLeft,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code,
  Minus,
  Highlighter,
  Indent,
  Outdent,
  Pen,
  MousePointer2,
  Eraser,
  Link2,
  Unlink,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCanvasStore } from '@/lib/store/canvas-store';
import { NoteDrawingCanvas } from './NoteDrawingCanvas';

interface NoteEditorProps {
  id: string;
  initialTitle: string;
  initialContent: string;
}

export function NoteEditor({ id, initialTitle, initialContent }: NoteEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [drawMode, setDrawMode] = useState<'off' | 'pen' | 'eraser'>('off');
  const [zenMode, setZenMode] = useState(false);
  const { closeNoteEditor } = useCanvasStore();
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hasAutoFocused = useRef(false);

  const save = useCallback(
    (updates: { title?: string; content?: string }) => {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        const body: Record<string, string> = {};
        if (updates.title !== undefined) body.title = updates.title;
        if (updates.content !== undefined) body.content = updates.content;

        const currentTitle = updates.title ?? title;
        const currentContent = updates.content ?? editor?.getHTML() ?? '';
        body.searchText = `${currentTitle} ${currentContent}`.replace(/<[^>]*>/g, '');

        await fetch(`/api/cards/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }, 400);
    },
    [id, title]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Placeholder.configure({
        placeholder: 'Start writing... Use / for commands',
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Underline,
      Highlight.configure({ multicolor: false }),
      Link.configure({
        openOnClick: 'whenNotEditable',
        HTMLAttributes: { class: 'editor-link', target: '_blank', rel: 'noopener noreferrer' },
        autolink: true,
      }),
    ],
    content: initialContent,
    autofocus: !initialTitle,
    onUpdate: ({ editor }) => {
      save({ content: editor.getHTML() });
    },
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[60vh]',
      },
      handleKeyDown: (_view, event) => {
        // Tab to indent lists, Shift+Tab to outdent
        if (event.key === 'Tab') {
          if (editor?.isActive('listItem') || editor?.isActive('taskItem')) {
            event.preventDefault();
            if (event.shiftKey) {
              editor?.chain().focus().liftListItem('listItem').run() ||
              editor?.chain().focus().liftListItem('taskItem').run();
            } else {
              editor?.chain().focus().sinkListItem('listItem').run() ||
              editor?.chain().focus().sinkListItem('taskItem').run();
            }
            return true;
          }
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (hasAutoFocused.current) return;
    hasAutoFocused.current = true;
    if (!initialTitle && titleRef.current) {
      titleRef.current.focus();
    }
  }, [initialTitle]);

  const handleClose = useCallback(async () => {
    clearTimeout(saveTimeout.current);
    const content = editor?.getHTML() ?? '';
    try {
      await fetch(`/api/cards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          searchText: `${title} ${content}`.replace(/<[^>]*>/g, ''),
        }),
      });
      if ((window as any).__thinkUpdateNode) {
        (window as any).__thinkUpdateNode(id, { cardId: id, title, content, type: 'note' });
      }
    } catch (e) {
      console.error('Failed to save note:', e);
    }
    closeNoteEditor();
  }, [id, title, editor, closeNoteEditor]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (drawMode !== 'off') {
          setDrawMode('off');
        } else if (zenMode) {
          setZenMode(false);
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleClose, drawMode, zenMode]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    save({ title: e.target.value });
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      editor?.commands.focus('start');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in">
      {!zenMode && <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />}

      <div className={cn(
        'relative z-10 bg-white overflow-hidden flex flex-col animate-scale-in',
        zenMode
          ? 'w-full h-full'
          : 'mx-auto my-4 w-[calc(100vw-80px)] max-w-[760px] h-[calc(100vh-32px)] rounded-xl shadow-2xl'
      )}>
        {/* Top bar */}
        <div className={cn(
          'flex items-center px-5 py-3 flex-shrink-0 transition-opacity',
          zenMode ? 'border-b border-transparent hover:border-gray-100 opacity-0 hover:opacity-100' : 'border-b border-gray-100'
        )}>
          <button
            onClick={zenMode ? () => setZenMode(false) : handleClose}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{zenMode ? 'Exit focus mode' : 'Back to canvas'}</span>
          </button>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => setZenMode(!zenMode)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title={zenMode ? 'Exit focus mode' : 'Focus mode'}
            >
              {zenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <div className="text-xs text-gray-300">Esc to {zenMode ? 'exit' : 'close'}</div>
          </div>
        </div>

        {/* Formatting toolbar */}
        {editor && !zenMode && (
          <div className="flex items-center gap-0.5 px-5 py-1.5 border-b border-gray-100 flex-shrink-0 overflow-x-auto">
            <ToolbarBtn
              active={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="Bold (⌘B)"
            >
              <Bold className="w-4 h-4" />
            </ToolbarBtn>
            <ToolbarBtn
              active={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="Italic (⌘I)"
            >
              <Italic className="w-4 h-4" />
            </ToolbarBtn>
            <ToolbarBtn
              active={editor.isActive('underline')}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              title="Underline (⌘U)"
            >
              <UnderlineIcon className="w-4 h-4" />
            </ToolbarBtn>
            <ToolbarBtn
              active={editor.isActive('strike')}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </ToolbarBtn>
            <ToolbarBtn
              active={editor.isActive('highlight')}
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              title="Highlight"
            >
              <Highlighter className="w-4 h-4" />
            </ToolbarBtn>

            <div className="w-px h-5 bg-gray-200 mx-1" />

            <ToolbarBtn
              active={editor.isActive('heading', { level: 1 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </ToolbarBtn>
            <ToolbarBtn
              active={editor.isActive('heading', { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </ToolbarBtn>
            <ToolbarBtn
              active={editor.isActive('heading', { level: 3 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              title="Heading 3"
            >
              <Heading3 className="w-4 h-4" />
            </ToolbarBtn>

            <div className="w-px h-5 bg-gray-200 mx-1" />

            <ToolbarBtn
              active={editor.isActive('bulletList')}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="Bullet list"
            >
              <List className="w-4 h-4" />
            </ToolbarBtn>
            <ToolbarBtn
              active={editor.isActive('orderedList')}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              title="Numbered list"
            >
              <ListOrdered className="w-4 h-4" />
            </ToolbarBtn>
            <ToolbarBtn
              active={editor.isActive('taskList')}
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              title="Task list"
            >
              <ListChecks className="w-4 h-4" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => {
                if (editor.isActive('listItem')) {
                  editor.chain().focus().sinkListItem('listItem').run();
                } else if (editor.isActive('taskItem')) {
                  editor.chain().focus().sinkListItem('taskItem').run();
                }
              }}
              title="Indent (Tab)"
            >
              <Indent className="w-4 h-4" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => {
                if (editor.isActive('listItem')) {
                  editor.chain().focus().liftListItem('listItem').run();
                } else if (editor.isActive('taskItem')) {
                  editor.chain().focus().liftListItem('taskItem').run();
                }
              }}
              title="Outdent (Shift+Tab)"
            >
              <Outdent className="w-4 h-4" />
            </ToolbarBtn>

            <div className="w-px h-5 bg-gray-200 mx-1" />

            <ToolbarBtn
              active={editor.isActive('blockquote')}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              title="Quote"
            >
              <Quote className="w-4 h-4" />
            </ToolbarBtn>
            <ToolbarBtn
              active={editor.isActive('codeBlock')}
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              title="Code block"
            >
              <Code className="w-4 h-4" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Divider"
            >
              <Minus className="w-4 h-4" />
            </ToolbarBtn>
            <ToolbarBtn
              active={editor.isActive('link')}
              onClick={() => {
                if (editor.isActive('link')) {
                  editor.chain().focus().unsetLink().run();
                } else {
                  const url = window.prompt('URL');
                  if (url) {
                    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                  }
                }
              }}
              title="Link"
            >
              {editor.isActive('link') ? <Unlink className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
            </ToolbarBtn>

            <div className="w-px h-5 bg-gray-200 mx-1" />

            {/* Drawing toggle */}
            <ToolbarBtn
              active={drawMode === 'pen'}
              onClick={() => setDrawMode(drawMode === 'pen' ? 'off' : 'pen')}
              title="Draw"
            >
              <Pen className="w-4 h-4" />
            </ToolbarBtn>
            <ToolbarBtn
              active={drawMode === 'eraser'}
              onClick={() => setDrawMode(drawMode === 'eraser' ? 'off' : 'eraser')}
              title="Erase drawing"
            >
              <Eraser className="w-4 h-4" />
            </ToolbarBtn>
          </div>
        )}

        {/* Writing surface */}
        <div className="flex-1 overflow-y-auto relative">
          <div className={cn(
            'mx-auto px-8 transition-all duration-300',
            zenMode ? 'max-w-[720px] py-20' : 'max-w-[640px] py-10'
          )}>
            <input
              ref={titleRef}
              value={title}
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              placeholder="Untitled"
              className="w-full text-3xl font-bold text-gray-900 bg-transparent border-none outline-none placeholder:text-gray-300 mb-6 leading-tight"
            />

            <div className="note-editor-content text-base text-gray-700 leading-relaxed">
              <EditorContent editor={editor} />
            </div>
          </div>

          {/* Drawing overlay inside the note */}
          {drawMode !== 'off' && (
            <NoteDrawingCanvas noteId={id} mode={drawMode} />
          )}
        </div>
      </div>
    </div>
  );
}

function ToolbarBtn({
  children,
  active,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded-md transition-colors',
        active ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
      )}
    >
      {children}
    </button>
  );
}
