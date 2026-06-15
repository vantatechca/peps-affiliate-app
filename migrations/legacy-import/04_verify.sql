-- ============================================================
-- 04_verify.sql  —  reconciliation (run FOURTH, read the output)
-- Every row should show legacy = migrated. Dollar totals must match.
-- ============================================================
SELECT 'users'             AS entity,
       (SELECT count(*) FROM public."User")                                            AS legacy,
       (SELECT count(*) FROM users u
          WHERE EXISTS (SELECT 1 FROM public."User" l WHERE l.id::uuid = u.id))        AS migrated
UNION ALL
SELECT 'creator_profiles',
       (SELECT count(*) FROM public."User" WHERE role = 'AFFILIATE'),
       (SELECT count(*) FROM creator_profiles cp
          WHERE EXISTS (SELECT 1 FROM public."User" l
                        WHERE l.id::uuid = cp.user_id AND l.role = 'AFFILIATE'))
UNION ALL
SELECT 'promo_codes',
       (SELECT count(*) FROM public."DiscountCode"),
       (SELECT count(*) FROM promo_codes p
          WHERE EXISTS (SELECT 1 FROM public."DiscountCode" d WHERE d.id::uuid = p.id))
UNION ALL
SELECT 'commission_splits',
       (SELECT count(*) FROM public."CommissionSplit"),
       (SELECT count(*) FROM legacy_commission_splits)
UNION ALL
SELECT 'creator_payouts',
       (SELECT count(*) FROM public."Payout"),
       (SELECT count(*) FROM creator_payouts cp
          WHERE EXISTS (SELECT 1 FROM public."Payout" l WHERE l.id::uuid = cp.id))
UNION ALL
SELECT 'legacy_orders',
       (SELECT count(*) FROM public."Order"),
       (SELECT count(*) FROM legacy_orders)
UNION ALL
SELECT 'code_redemptions (attributed)',
       (SELECT count(*) FROM public."Order" WHERE attributed = true AND "discountCodeId" IS NOT NULL),
       (SELECT count(*) FROM code_redemptions
          WHERE vendor_id = 'a0000000-0000-4000-8000-0000000000a2')
UNION ALL
SELECT 'order_commissions',
       (SELECT count(*) FROM public."OrderCommission"),
       (SELECT count(*) FROM legacy_order_commissions)
UNION ALL
SELECT 'order_total $ (x100)',
       round((SELECT COALESCE(sum("orderTotal"), 0) FROM public."Order") * 100),
       round((SELECT COALESCE(sum(order_total),  0) FROM legacy_orders)  * 100)
UNION ALL
SELECT 'commission $ (x100)',
       round((SELECT COALESCE(sum(amount), 0) FROM public."OrderCommission") * 100),
       round((SELECT COALESCE(sum(amount), 0) FROM legacy_order_commissions) * 100);
