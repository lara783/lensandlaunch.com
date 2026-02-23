-- ─── Storage Bucket RLS Policies ─────────────────────────────────────────────
-- Without these, ALL uploads and reads are blocked even on public buckets.
--
-- assets bucket:  client brand kit uploads (logo, fonts, images)
-- documents bucket: admin-uploaded invoices/contracts per client

-- ── assets: public read ───────────────────────────────────────────────────────
CREATE POLICY "assets: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assets');

-- assets: clients upload to their own uid-prefixed folder
CREATE POLICY "assets: authenticated upload own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'assets'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- assets: admins can upload to any path in assets
CREATE POLICY "assets: admin upload any"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'assets'
    AND is_admin()
  );

-- assets: users delete their own objects, admins delete any
CREATE POLICY "assets: delete own or admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'assets'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR is_admin()
    )
  );

-- ── documents: authenticated read (client sees their own via signed URL or public) ──
CREATE POLICY "documents: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

-- documents: only admins can upload
CREATE POLICY "documents: admin upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND is_admin()
  );

-- documents: admins can delete
CREATE POLICY "documents: admin delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND is_admin()
  );

-- documents: admins can update (e.g. overwrite)
CREATE POLICY "documents: admin update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents'
    AND is_admin()
  );
