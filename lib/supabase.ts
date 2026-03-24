import { createClient } from "@supabase/supabase-js";

// Server-side client with service role — bypasses RLS, only used in API routes
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Supabase env vars not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type Announcement = {
  id: string;
  message: string;
  onclick: string | null;
  display: boolean;
  created_at: string;
};

export type AnnouncementWithImage = {
  id: string;
  message: string;
  image_url: string;
  onclick: string | null;
  display: boolean;
  created_at: string;
};

export type AppConfig = {
  id: 1;
  maintenance_mode: boolean;
  maintenance_message: string | null;
  minimum_version: string;
  download_url: string | null;
  updated_at: string;
};

export type OrganiserAppConfig = {
  id: 1;
  maintenance_mode: boolean;
  maintenance_message: string | null;
  minimum_version: string;
  download_url: string | null;
  updated_at: string | null;
};

export type Organiser = {
  id: string;
  user_id: string;
  glenn_id: string;
  name: string;
  contact_number: string;
  alternate_contact_number: string | null;
  address: string;
  aadhar_card_url: string | null;
  hosted_count: number;
  balance: string;
  organiser_commission: string;
  onesignal_player_id: string | null;
  created_at: string;
  updated_at: string;
};

export type OrganiserTransaction = {
  id: string;
  organiser_id: string;
  amount: string;
  type: "credit" | "debit" | "commission" | "penalty";
  description: string | null;
  tournament_id: string | null;
  status: "pending" | "paid" | "failed";
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  wallet_id: string;
  amount: string;
  transaction_type: string;
  related_tournament_id: string | null;
  old_balance: string | null;
  new_balance: string | null;
  created_at: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  payment_status: "pending" | "verified" | "completed" | "failed" | "refunded" | "cancelled";
  payment_metadata: Record<string, unknown> | null;
  updated_at: string | null;
  withdrawal_method: "UPI" | "BANK" | "GIFTCARD" | null;
  platform_fee: string;
  withdrawal_account_details: Record<string, unknown> | null;
  payment_reference: string | null;
  expected_payout_date: string | null;
  redeem_code: string | null;
};

export type SensitiveUserdata = {
  id: string;
  username: string;
  email: string;
  followercount: number;
  followingcount: number;
  tournmentsplayed: number;
  tournamentswon: number;
  winrate: number;
  kills: number;
  death: number;
  name: string;
  ffuid: string | null;
  ffname: string | null;
  yturl: string | null;
  instaurl: string | null;
  bio: string | null;
  avatarurl: string;
  otherurls: Record<string, unknown> | null;
  squad: Record<string, unknown> | null;
  isonline: boolean;
  lastseen: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_bluetick: boolean;
  banned_until: string | null;
  ban_reason: string | null;
  is_banned: boolean;
  rank: number | null;
  earnings: number;
  is_redtick: boolean;
  ff_creation_date: string | null;
  ff_level: number | null;
};

export type PublicUserdata = {
  id: string;
  username: string;
  email: string;
  name: string;
  ffuid: string | null;
  ffname: string | null;
  yturl: string | null;
  instaurl: string | null;
  bio: string | null;
  avatarurl: string;
  otherurls: Record<string, unknown> | null;
  squad: Record<string, unknown> | null;
  isonline: boolean;
  lastseen: string | null;
  created_at: string | null;
  updated_at: string | null;
  sc_character: string | null;
  sc_weapon: string | null;
  sc_weapon2: string | null;
};

export type BlockedUser = {
  id: string;
  blocker_id: string | null;
  blocked_id: string | null;
  created_at: string | null;
  ip_address: string | null;
  device_info: Record<string, unknown> | null;
};

export type CommunityMessage = {
  id: string;
  user_id: string;
  text: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  likes: number;
  comments: number;
};

export type CommunityLike = {
  id: string;
  message_id: string;
  user_id: string;
  created_at: string | null;
};

export type CommunityComment = {
  id: string;
  message_id: string;
  parent_comment_id: string | null;
  user_id: string;
  content: string;
  likes_count: number;
  replies_count: number;
  created_at: string | null;
  updated_at: string | null;
};

export type DirectMsg = {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string | null;
  media_urls: string[] | null;
  giphy_urls: string[] | null;
  created_at: string | null;
  read_at: string | null;
  deleted_for_sender: boolean;
  deleted_for_receiver: boolean;
  reply_to_message_id: string | null;
  meme_sound: string | null;
};

export type Follower = {
  id: string;
  follower_id: string | null;
  following_id: string | null;
  created_at: string | null;
};

export type NotificationSettings = {
  id: string;
  user_id: string;
  onesignal_player_id: string | null;
  is_notifications_enabled: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type UserNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string | null;
  updated_at: string | null;
  sent: boolean;
};

export type Wallet = {
  id: string;
  user_id: string;
  balance: number;
  last_updated: string | null;
  created_at: string | null;
  allow_withdrawals: boolean;
  allow_deposits: boolean;
  fraud_reason: string | null;
};

export type UserFeedback = {
  id: string;
  user_id: string;
  category: "feedback" | "idea" | "bug" | "feature_request" | "other";
  title: string;
  message: string;
  created_at: string;
};

export type Tournament = {
  id: string;
  tournament_name: string;
  type: "solo" | "duo" | "squad";
  categories: string;
  description: string | null;
  maptype: string | null;
  totalslots: number;
  slotsleft: number;
  tournament_datetime: string;
  entryfee: string;
  prizepool: string;
  per_kill: number;
  image_url: string | null;
  banner_url: string | null;
  prizedistribution: Record<string, unknown> | null;
  is_big_tournament: boolean;
  moderators: Record<string, unknown> | null;
  support_contact: string | null;
  revive_allowed: boolean;
  result_verified: boolean;
  roomid: string | null;
  roompass: string | null;
  stream_url: string | null;
  registration_allowed: boolean;
  results_submitted: boolean;
  payout_status: string;
  organiser_id: string | null;
  organiser_name: string | null;
  organiser_contact: string | null;
  organiser_commission: string;
  created_at: string;
  updated_at: string;
};

export type TournamentTemplate = {
  id: string;
  type: "solo" | "duo" | "squad";
  tournament_name: string;
  description: string | null;
  categories: string;
  maptype: string | null;
  totalslots: number;
  entryfee: string;
  prizepool: string;
  image_url: string | null;
  prizedistribution: Record<string, unknown> | null;
  is_big_tournament: boolean;
  banner_url: string | null;
  moderators: Record<string, unknown> | null;
  support_contact: string | null;
  revive_allowed: boolean;
  per_kill: number;
  created_at: string;
  updated_at: string;
};

export type AdminNotes = {
  id: string;
  user_id: string;
  device_info: Record<string, unknown>[] | null;
  contacts: { name: string; phone: string }[] | null;
  locations_app_open: Record<string, unknown>[] | null;
  internal_notes: string | null;
  vpn_detection: Record<string, unknown>[] | null;
  ban_history: Record<string, unknown>[] | null;
  installed_apps: Record<string, unknown>[] | null;
  contacts_last_synced: string | null;
  created_at: string | null;
  updated_at: string | null;
  phone_number: string | null;
};
