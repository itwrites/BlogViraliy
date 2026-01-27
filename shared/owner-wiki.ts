export interface WikiSection {
  id: string;
  title: string;
  content: string;
  subsections?: WikiSection[];
}

export interface WikiData {
  title: string;
  description: string;
  lastUpdated: string;
  sections: WikiSection[];
}

export const ownerWikiData: WikiData = {
  title: "Owner Guide",
  description: "A friendly, owner-focused guide to running your sites with Blog Autopilot",
  lastUpdated: "2026-01-27",
  sections: [
    {
      id: "overview",
      title: "Welcome",
      content: `Blog Autopilot is designed to feel simple. As an owner, you focus on **your sites**, **content**, and **brand** -- without worrying about platform administration.

**What owners can do:**
- Create and manage sites
- Customize branding, navigation, and themes
- Create, schedule, and publish content
- Manage billing and plan limits

Admins can see more (global users, system-wide settings), but owners only see what matters for their sites.`,
    },
    {
      id: "quick-start",
      title: "Quick Start",
      content: `Follow this simple path to launch your first site:

1. **Create a site** from the Owner Dashboard.
2. **Complete onboarding** to capture your business voice and positioning.
3. **Review Look & Feel** to pick your theme and upload branding.
4. **Create your first article** and set a publish time.
5. **Check the Calendar** to confirm scheduling.`,
    },
    {
      id: "owner-areas",
      title: "What You Can Manage",
      content: `Use this table as a quick map of the owner experience:

| Area | Where to find it | What it does |
|------|------------------|--------------|
| Sites | Owner Dashboard | Create and open your sites |
| Articles | Site -> Articles | Write, generate, schedule, and publish |
| Calendar | Site -> Calendar | See scheduled articles |
| Look & Feel | Site -> Settings -> Look & Feel | Theme, colors, logo, favicon |
| SEO | Site -> Settings -> SEO | Titles, descriptions, social preview |
| Business Profile | Site -> Settings -> Business | Brand voice and positioning |
| Navigation | Site -> Settings -> Menu & Navigation | Menus and labels |
| Public API | Site -> Settings -> Public API | Keys for integrations |
| Tools & Debug | Site -> Settings -> Tools | Diagnostics and troubleshooting |
| Billing | Owner Dashboard | Plan and usage limits |`,
    },
    {
      id: "content",
      title: "Content & Automation",
      content: `You can create content in three ways:

- **AI Assist:** Generate a draft and refine it  
- **Manual:** You write and publish on your own schedule  
- **Scheduled:** Choose a publish date and time  

**Tip:** Start with a few AI-assisted drafts, then refine the tone to match your brand.`,
      subsections: [
        {
          id: "drafts",
          title: "Drafts and Publishing",
          content: `Drafts let you review content before it goes live.

**Published** means the article is visible on your site.  
**Draft** keeps it private until you are ready.`,
        },
        {
          id: "scheduling",
          title: "Scheduling",
          content: `Scheduling puts your content on a predictable timeline.

Use the Calendar tab to verify upcoming posts and adjust dates when needed.`,
        },
      ],
    },
    {
      id: "look-and-feel",
      title: "Look & Feel",
      content: `Your branding lives in **Settings -> Look & Feel**.

You can adjust:
- Theme selection
- Logo and favicon
- Typography and colors
- Layout options

**Keep it simple:** choose one theme and only adjust a few settings at first.`,
    },
    {
      id: "billing",
      title: "Billing & Limits",
      content: `Your plan controls how many assets and sites you can run.

| Plan Area | What it limits |
|-----------|----------------|
| Sites | How many sites you can create |
| Assets | Monthly publishing capacity |
| Automation | Number of scheduled items and drafts |

You can upgrade anytime from the Owner Dashboard.`,
    },
    {
      id: "reverse-proxy",
      title: "Reverse Proxy (Advanced)",
      content: `If your blog lives under a sub-path (like \`yoursite.com/blog\`), use reverse proxy settings.

**When you need this:**
- Your main site is hosted elsewhere
- You want the blog to appear under a sub-path

**Where to configure:**
Settings -> General -> Domains & Routing

**Key fields:**

| Field | Example | What it means |
|------|---------|---------------|
| Base Path | \`/blog\` | The sub-path where the blog lives |
| Deployment Mode | Reverse Proxy | Tells the system to use proxy routing |
| Visitor Hostname | \`yoursite.com\` | The domain your visitors see |

**Basic nginx header (example):**

\`\`\`nginx
proxy_set_header X-BV-Visitor-Host yoursite.com;
\`\`\`

If you're unsure, ask your developer or hosting provider. This is the only part of settings that requires technical setup.`,
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      content: `**Common questions**

**"My site loads but links break."**  
Make sure reverse proxy is configured for both page and API routes.

**"I don't see new articles."**  
Check your scheduled dates and publishing status.

**"Branding didn't update."**  
Refresh the site and re-check Look & Feel settings.

If something still feels off, contact support with your site URL and a short description.`,
    },
  ],
};
