'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCreateNote, useNotes } from '@/hooks/useNotes';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

const schema = z.object({
  content: z.string().min(1, 'Write a note first'),
});

type NoteFormValues = z.infer<typeof schema>;

export function NotesPanel({ customerId }: { customerId: string }) {
  const notes = useNotes(customerId);
  const createNote = useCreateNote(customerId);
  const form = useForm<NoteFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { content: '' },
  });

  async function onSubmit(values: NoteFormValues) {
    await createNote.mutateAsync(values.content);
    form.reset();
  }

  return (
    <section className="space-y-4 rounded-lg border border-border bg-white p-5 shadow-soft">
      <div>
        <h2 className="text-lg font-semibold">Notes</h2>
        <p className="mt-1 text-sm text-muted">Conversation history and customer context.</p>
      </div>

      <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        <Textarea placeholder="Add a note..." {...form.register('content')} />
        {form.formState.errors.content && (
          <p className="text-xs text-danger">{form.formState.errors.content.message}</p>
        )}
        <Button disabled={createNote.isPending}>
          <Send size={16} />
          Add note
        </Button>
      </form>

      <div className="space-y-3">
        {notes.isLoading && <p className="text-sm text-muted">Loading notes...</p>}
        {notes.data?.map((note) => (
          <article key={note.id} className="rounded-md border border-border bg-surface p-3">
            <p className="text-sm">{note.content}</p>
            <p className="mt-2 text-xs text-muted">
              {note.createdByUser?.name ?? 'Unknown user'} - {new Date(note.createdAt).toLocaleString()}
            </p>
          </article>
        ))}
        {notes.data?.length === 0 && <p className="text-sm text-muted">No notes yet.</p>}
      </div>
    </section>
  );
}
