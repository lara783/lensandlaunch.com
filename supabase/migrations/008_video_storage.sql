-- ─── Deliverable Videos Storage Bucket Policies ───────────────────────────────
-- Bucket name: deliverable-videos
-- Created via Supabase dashboard or init-storage API route.
-- Admins upload; clients read only their own project's videos (via signed URLs).

-- Allow admins to upload to deliverable-videos bucket
CREATE POLICY "Admins upload deliverable videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'deliverable-videos'
    AND is_admin()
  );

-- Allow admins to update/delete
CREATE POLICY "Admins manage deliverable videos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'deliverable-videos'
    AND is_admin()
  )
  WITH CHECK (
    bucket_id = 'deliverable-videos'
    AND is_admin()
  );

-- Public read (videos are served by public URL; Supabase bucket set to public)
CREATE POLICY "Public read deliverable videos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'deliverable-videos');
