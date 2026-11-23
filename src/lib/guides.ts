// SEO guide pages: one entry per public landing page under /(marketing)/<slug>.
// Copy only describes features that exist in the app. No prices here — those live in #pricing on the home page.

export type Guide = {
  slug: string;
  short: string; // footer link label
  title: string; // <title>, ≤ 60 chars
  description: string; // meta description, ≤ 155 chars
  h1: string;
  kicker: string;
  intro: string[];
  steps: { h: string; p: string }[];
  features: { h: string; p: string }[];
  why: { h: string; p: string[] };
  faq: { q: string; a: string }[];
};

export const SITE = "https://gta6trim.com";

const PERMISSION_FAQ = {
  q: "Can I clip any streamer's GTA 6 stream?",
  a: "Only clip and repost content you own or have the creator's permission to use, for example your own stream or a paid clipping campaign. GTA6 Trim asks you to confirm this before it clips someone else's channel, and you're responsible for following copyright law and each platform's rules.",
};

const TRIAL_FAQ = {
  q: "Is there a free trial?",
  a: "Yes. Every plan starts with a 1-day free trial. You add a card to verify it, nothing is charged that day, and you can clip 2 live streams and 2 YouTube videos. Cancel before the day ends and you pay nothing; otherwise the plan you picked starts.",
};

export const GUIDES: Guide[] = [
  {
    slug: "gta-6-clips-for-tiktok",
    short: "GTA 6 clips for TikTok",
    title: "GTA 6 Clips for TikTok, Made Automatically | GTA6 Trim",
    description: "Turn GTA 6 streams into vertical TikTok clips automatically: AI finds the best moments, adds captions and a hook, and can post them for you.",
    h1: "Turn GTA 6 streams into TikTok clips automatically",
    kicker: "Guide · TikTok",
    intro: [
      "TikTok rewards accounts that post often, and GTA 6 streams are full of moments that work as short clips: chases, crashes, heists that go wrong, and reactions. The hard part is the time it takes to scrub through hours of footage, cut the moment, reframe it to vertical and caption it.",
      "GTA6 Trim does that work for you. It watches the stream or video, picks the moments most likely to hold attention, and turns each one into a 9:16 clip with word-by-word captions, ready for TikTok.",
    ],
    steps: [
      { h: "Pick a stream or video", p: "Choose a live GTA 6 stream on Twitch or Kick, or paste a long YouTube video. Confirm you own the content or have permission to clip it." },
      { h: "AI finds the moments", p: "GTA6 Trim transcribes the audio and scores each stretch for how clip-worthy it is. Live streams are processed in 10-minute chunks, so new clips land while the stream is still running." },
      { h: "Download or post", p: "Each clip comes out vertical with captions, a hook line and optional emoji stickers. Download it, save it to cloud storage, or post it to TikTok straight from the dashboard on the Studio plan." },
    ],
    features: [
      { h: "Captions people read", p: "Word-by-word captions with the spoken word highlighted, in 8 caption styles. Pro and Studio let you set your own colours." },
      { h: "A hook in the first seconds", p: "Each clip opens with a short on-screen hook line so viewers know why to keep watching. You can rewrite it in the clip editor." },
      { h: "AI captions and hashtags", p: "On Pro and Studio, GTA6 Trim writes the TikTok caption and hashtags for each clip, credits the streamer, and lets you rewrite them." },
      { h: "Your brand on every clip", p: "Add your logo and @handle as a small watermark with the brand kit, so reposts still lead back to you." },
      { h: "Edit before you post", p: "Trim the start and end, fix a caption word, change the hook or remove the stickers, then re-render the clip in place." },
    ],
    why: {
      h: "Why vertical, captioned clips work on TikTok",
      p: [
        "Most TikTok viewers watch with the sound off at first, so captions decide whether someone stays past the first second. A clear hook line and big, readable captions give a GTA 6 moment its best chance in the feed.",
        "Posting consistently matters too. Because GTA6 Trim clips while a stream is live, you can post fresh moments the same day they happen instead of days later.",
      ],
    },
    faq: [
      { q: "What size are the clips?", a: "Clips are 1080×1920 vertical video (9:16), the format TikTok, YouTube Shorts and Instagram Reels expect. Streams with a facecam keep the webcam on top and the gameplay below." },
      { q: "Can GTA6 Trim post to TikTok for me?", a: "Yes, on the Studio plan. You connect your TikTok account through a secure login page (we never see your password), then post now, schedule, or turn on auto-post for live sessions." },
      { q: "How long are the clips?", a: "Most clips are 20 to 60 seconds, cut around one moment. You can trim any clip in the editor." },
      PERMISSION_FAQ,
      TRIAL_FAQ,
    ],
  },
  {
    slug: "twitch-clip-to-shorts",
    short: "Twitch to YouTube Shorts",
    title: "Clip Twitch GTA 6 Streams into YouTube Shorts | GTA6 Trim",
    description: "Clip live Twitch GTA 6 streams into YouTube Shorts while they're still live. AI picks the moments, adds captions and writes the Shorts title.",
    h1: "Clip Twitch GTA 6 streams into YouTube Shorts",
    kicker: "Guide · Twitch to Shorts",
    intro: [
      "Twitch's own clip button makes a horizontal clip that someone has to spot and press in the moment. YouTube Shorts needs vertical video with captions, and the best moments are easy to miss in a multi-hour stream.",
      "GTA6 Trim records a live Twitch stream in 10-minute chunks, finds the strongest moments in each one and turns them into vertical Shorts while the stream is still running.",
    ],
    steps: [
      { h: "Start a live session", p: "Pick a live GTA 6 stream from the Twitch list in the dashboard, or type a channel name. Confirm you own the channel or have the streamer's permission." },
      { h: "Clips arrive during the stream", p: "Every 10 minutes the latest chunk is transcribed and scored. The best moments become vertical clips, usually 10 to 15 minutes after they happen." },
      { h: "Post as Shorts", p: "Download the clips, or on Studio post them to YouTube as Shorts with an AI-written title and description. You can also schedule them." },
    ],
    features: [
      { h: "Auto-start when they go live", p: "Save the channels you clip and GTA6 Trim starts a session by itself within about 2 minutes of the stream going live, so you don't miss the start." },
      { h: "Facecam-aware layout", p: "When the stream has a webcam, the clip keeps the streamer's face on top and the gameplay below, with captions on the seam." },
      { h: "YouTube-ready text", p: "On Pro and Studio each clip gets a YouTube title and description written for Shorts, crediting the streamer." },
      { h: "Auto-post the best clips", p: "On Studio, turn on auto-post for a session: the best new clip is posted to your chosen accounts at most once per gap you set." },
      { h: "Several streams at once", p: "Each plan lets you clip more than one live stream at the same time, so you can cover several streamers in one evening." },
    ],
    why: {
      h: "Why clip during the stream, not after",
      p: [
        "Shorts about a moment do best while people are still talking about it. Clipping live means a chase or a big heist can be on YouTube the same evening.",
        "It also saves you from rewatching the VOD. Sessions stop by themselves when the stream ends, or after 3 hours.",
      ],
    },
    faq: [
      { q: "Do I need the streamer's Twitch login?", a: "No. GTA6 Trim records the public live stream. You do need to own the channel or have the streamer's permission to clip and repost it." },
      { q: "How quickly do clips appear?", a: "Streams are processed in 10-minute chunks, so new clips usually appear 10 to 15 minutes after the moment happens." },
      { q: "Can it post to more than one YouTube channel?", a: "Yes. On Studio you can connect up to 3 accounts per platform, including 3 YouTube channels, and choose which ones each clip goes to." },
      PERMISSION_FAQ,
      TRIAL_FAQ,
    ],
  },
  {
    slug: "kick-stream-clipper",
    short: "Kick stream clipper",
    title: "Kick Stream Clipper for GTA 6 Streams | GTA6 Trim",
    description: "Auto-clip live Kick GTA 6 streams into vertical Shorts, TikToks and Reels with captions. Clips arrive while the stream is still live.",
    h1: "Auto-clip Kick GTA 6 streams",
    kicker: "Guide · Kick",
    intro: [
      "A lot of GTA 6 roleplay and chaos streams happen on Kick, and most clipping tools only support Twitch. GTA6 Trim clips Kick streams the same way it clips Twitch: live, in 10-minute chunks, straight into vertical clips.",
      "You pick the stream, GTA6 Trim does the watching, and the best moments show up in your dashboard as captioned Shorts.",
    ],
    steps: [
      { h: "Choose a Kick stream", p: "Switch the live list to Kick and pick a GTA 6 stream, or type a Kick channel name or link. Confirm you have permission to clip it." },
      { h: "Let it clip live", p: "GTA6 Trim records the stream in 10-minute chunks, transcribes each one and cuts the strongest moments into vertical clips with captions." },
      { h: "Use the clips anywhere", p: "Download them, save them to cloud storage, or post to TikTok, YouTube Shorts, Instagram Reels and Facebook from the dashboard on Studio." },
    ],
    features: [
      { h: "Same quality as Twitch", p: "Kick clips get the same captions, hook line, emoji stickers and facecam-aware layout as Twitch clips." },
      { h: "Auto-start for Kick channels", p: "Add a Kick channel to auto-start and a session begins by itself when the channel goes live." },
      { h: "Clip editor", p: "Adjust the cut, fix caption words, change the hook or switch stickers off, then re-render the clip in place." },
      { h: "Track what works", p: "On Studio, the Posted page shows views, likes and comments for every posted clip, and the What works section points out your best streamers, times and clip lengths." },
      { h: "Work as a team", p: "Studio includes 3 seats, so a team can share the same clips, sessions and connected accounts without sharing passwords." },
    ],
    why: {
      h: "Why clip Kick streams",
      p: [
        "Kick streams often have fewer people clipping them than the biggest Twitch channels, so good moments are less likely to have been posted already.",
        "Clipping live keeps you early: the moment is on your pages before the stream has even ended.",
      ],
    },
    faq: [
      { q: "Does it work with any Kick channel?", a: "It works with public live Kick streams. You need to own the channel or have the streamer's permission to clip and repost it." },
      { q: "Can I clip Kick and Twitch at the same time?", a: "Yes. Live sessions from both platforms count toward the same live-session limit on your plan." },
      { q: "What happens when the stream ends?", a: "The session stops by itself when the stream ends, or after 3 hours, and finishes clipping the last chunk." },
      PERMISSION_FAQ,
      TRIAL_FAQ,
    ],
  },
  {
    slug: "youtube-video-to-shorts",
    short: "YouTube video to Shorts",
    title: "Turn Long GTA 6 YouTube Videos into Shorts | GTA6 Trim",
    description: "Paste a long GTA 6 YouTube video and get vertical Shorts with captions and a hook. AI finds the best moments for you to post or download.",
    h1: "Turn long GTA 6 YouTube videos into Shorts",
    kicker: "Guide · YouTube to Shorts",
    intro: [
      "A two-hour GTA 6 stream VOD or let's-play can hold a dozen good Shorts, but finding them means watching the whole thing. GTA6 Trim does that pass for you.",
      "Paste a YouTube link and it transcribes the video, scores every stretch and cuts the strongest moments into vertical clips with captions and a hook.",
    ],
    steps: [
      { h: "Paste the link", p: "Copy the YouTube video link into Make clips and confirm you own the video or have permission to use it. You can also upload a video file." },
      { h: "Get the best moments", p: "GTA6 Trim reads the captions (or transcribes the audio when there are none), picks the moments most likely to hold attention, and renders each as a vertical clip." },
      { h: "Edit, save or post", p: "Open any clip to adjust the cut or captions, then download it, save it to cloud storage, or post it on the Studio plan." },
    ],
    features: [
      { h: "Works without captions", p: "If the video has no YouTube captions, GTA6 Trim transcribes the audio itself." },
      { h: "Scored moments", p: "Every clip has a score, so you can post the strongest ones first and sort clips by score in My clips." },
      { h: "8 caption styles", p: "Choose a caption style in the brand kit. Pro and Studio unlock all 8 styles plus your own colours, logo and @handle." },
      { h: "AI post text", p: "On Pro and Studio, get a ready-to-copy title, caption and hashtags for TikTok, YouTube, Instagram and Facebook." },
      { h: "Save to cloud storage", p: "Send clips straight to Google Drive into a GTA6 Trim folder, with Dropbox and OneDrive on Pro and Studio." },
    ],
    why: {
      h: "Why repurpose long videos into Shorts",
      p: [
        "Shorts reach people who would never start a two-hour video, and a good Short sends viewers back to the full video and your channel.",
        "Because the best moments are scored, you spend your time choosing between clips rather than scrubbing a timeline.",
      ],
    },
    faq: [
      { q: "How long can the video be?", a: "Each plan has a maximum video length and a monthly number of YouTube imports; you can see both on the pricing section of the home page." },
      { q: "How many clips do I get from one video?", a: "Usually 3 to 10, depending on the video's length and how many strong moments it has." },
      { q: "Can I upload my own file instead of a link?", a: "Yes. You can upload a video file instead of pasting a YouTube link." },
      PERMISSION_FAQ,
      TRIAL_FAQ,
    ],
  },
  {
    slug: "auto-post-gta-6-clips",
    short: "Auto-post GTA 6 clips",
    title: "Auto-Post GTA 6 Clips to TikTok, Reels & Shorts | GTA6 Trim",
    description: "Auto-post GTA 6 clips to TikTok, YouTube Shorts, Instagram Reels and Facebook, up to 3 accounts per platform, with AI-written captions.",
    h1: "Auto-post GTA 6 clips to TikTok, Reels, Shorts & Facebook",
    kicker: "Guide · Auto-post",
    intro: [
      "Clipping is only half the job. Running several pages means uploading each clip to every platform, writing a caption for each one and keeping a steady schedule.",
      "On the Studio plan, GTA6 Trim posts for you: connect your accounts once, and clips go out to TikTok, YouTube Shorts, Instagram Reels and Facebook Pages, on their own or on a schedule.",
    ],
    steps: [
      { h: "Connect your accounts", p: "Connect up to 3 accounts per platform through each platform's own login page. GTA6 Trim never sees or stores your passwords." },
      { h: "Choose how clips go out", p: "Post a clip now, schedule it, or turn on auto-post for a live session with a score bar and a minimum gap between posts." },
      { h: "Watch the results", p: "The Posted page shows every post per platform and account, with views, likes and comments, and a plain-English reason if a post fails." },
    ],
    features: [
      { h: "Every account you tick", p: "Pick several pages per platform and each one gets the clip. If one page fails, the others still post." },
      { h: "AI-written post text", p: "Each post gets a platform-specific caption and hashtags, and YouTube gets a proper title and description." },
      { h: "Auto-repost winners", p: "Turn on auto-repost and a clip that beats your usual views is posted again to accounts that don't have it yet, with fresh text, at most once a day." },
      { h: "Failure explanations", p: "When a platform rejects a post, GTA6 Trim explains why in plain words and how to fix it, and you can post again in one click." },
      { h: "Weekly results", p: "See which streamers, posting times and clip lengths get the most views in the What works section of the Posted page." },
    ],
    why: {
      h: "Why automate posting",
      p: [
        "Consistency is what grows clip pages, and it is the first thing to slip when you're posting by hand to four platforms. Auto-post keeps your pages active while you sleep or stream.",
        "Spacing posts out with a minimum gap also keeps your accounts within each platform's spam limits.",
      ],
    },
    faq: [
      { q: "Which plan includes auto-post?", a: "Auto-post, scheduling, auto-repost and post analytics are on the Studio plan, which also includes 3 team seats." },
      { q: "Do you need my social media passwords?", a: "No. You connect each account on the platform's own login page, and you can disconnect it at any time." },
      { q: "Can it post to more than one TikTok or Facebook page?", a: "Yes, up to 3 accounts per platform. Choose which accounts each clip or auto-post session uses." },
      PERMISSION_FAQ,
      TRIAL_FAQ,
    ],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
