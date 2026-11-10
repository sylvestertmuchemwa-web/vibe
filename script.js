const starterPosts = [
  {
    id: "welcome-1",
    name: "Alex Morgan",
    username: "@alex",
    time: "2 hours ago",
    text: "Welcome to Vibe! 🎉 A new place to connect, share and discover amazing things.",
    likes: 24,
    liked: false
  },
  {
    id: "welcome-2",
    name: "Jordan Lee",
    username: "@jordan",
    time: "4 hours ago",
    text: "Today is a new opportunity to do something amazing. Keep going! ✨",
    likes: 18,
    liked: false
  },
  {
    id: "welcome-3",
    name: "Sam Rivera",
    username: "@sam",
    time: "Yesterday",
    text: "What song has been on repeat for you lately? 🎧",
    likes: 9,
    liked: false
  }
];

const STORAGE_KEY = "vibe-demo-posts-v1";
let posts = loadPosts();

const feed = document.getElementById("feed");
const postInput = document.getElementById("postInput");
const publishButton = document.getElementById("publishButton");
const characterCount = document.getElementById("characterCount");
const searchInput = document.getElementById("searchInput");
const toast = document.getElementById("toast");

function loadPosts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : starterPosts;
  } catch {
    return starterPosts;
  }
}

function savePosts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch {
    showToast("Your browser could not save this post.");
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function renderPosts(query = "") {
  const normalizedQuery = query.trim().toLowerCase();
  const visiblePosts = posts.filter(post =>
    `${post.name} ${post.username} ${post.text}`.toLowerCase().includes(normalizedQuery)
  );

  if (!visiblePosts.length) {
    feed.innerHTML = `<div class="card empty-state"><div class="empty-icon">⌕</div><h2>No posts found</h2><p>Try another search or create a new post.</p></div>`;
    return;
  }

  feed.innerHTML = visiblePosts.map(post => `
    <article class="card post-card">
      <div class="post-head">
        <div class="post-avatar">${escapeHTML(post.name.charAt(0).toUpperCase())}</div>
        <div class="post-person">
          <div class="post-name">${escapeHTML(post.name)}</div>
          <div class="post-meta">${escapeHTML(post.username)} · ${escapeHTML(post.time)}</div>
        </div>
        <span class="post-menu" aria-hidden="true">•••</span>
      </div>
      <p class="post-body">${escapeHTML(post.text)}</p>
      <div class="post-actions">
        <button class="action ${post.liked ? "liked" : ""}" data-like="${escapeHTML(post.id)}" aria-pressed="${post.liked}">
          ${post.liked ? "♥" : "♡"} ${post.likes} Like
        </button>
        <button class="action" data-comment="${escapeHTML(post.id)}">▢ Comment</button>
        <button class="action" data-share="${escapeHTML(post.id)}">↗ Share</button>
      </div>
    </article>
  `).join("");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function createPost() {
  const text = postInput.value.trim();
  if (!text) {
    showToast("Write something before sharing.");
    postInput.focus();
    return;
  }
  posts.unshift({
    id: `post-${Date.now()}`,
    name: "You",
    username: "@you",
    time: "Just now",
    text,
    likes: 0,
    liked: false
  });
  savePosts();
  postInput.value = "";
  characterCount.textContent = "0 / 500";
  renderPosts(searchInput.value);
  showToast("Your post was added to this browser.");
}

function setView(view) {
  const labels = {
    explore: ["✦", "Explore Vibe", "Discover people, topics and trending conversations. This section is a preview."],
    communities: ["◎", "Communities", "Community spaces are planned for a future Vibe update."],
    notifications: ["♡", "Notifications", "Your notifications area is a preview in this version."],
    profile: ["◉", "Your profile", "Profile creation and account settings will be added in a future version."]
  };

  document.querySelectorAll("[data-view]").forEach(button => {
    button.classList.toggle("active", button.dataset.view === view);
  });

  const isHome = view === "home";
  document.getElementById("homeView").classList.toggle("hidden", !isHome);
  document.getElementById("otherView").classList.toggle("hidden", isHome);

  if (!isHome) {
    const [icon, title, description] = labels[view] || labels.explore;
    document.getElementById("emptyIcon").textContent = icon;
    document.getElementById("emptyTitle").textContent = title;
    document.getElementById("emptyText").textContent = description;
  }
}

publishButton.addEventListener("click", createPost);
postInput.addEventListener("input", () => {
  characterCount.textContent = `${postInput.value.length} / 500`;
});
postInput.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") createPost();
});

feed.addEventListener("click", async event => {
  const likeButton = event.target.closest("[data-like]");
  const commentButton = event.target.closest("[data-comment]");
  const shareButton = event.target.closest("[data-share]");

  if (likeButton) {
    const post = posts.find(item => item.id === likeButton.dataset.like);
    if (!post) return;
    post.liked = !post.liked;
    post.likes += post.liked ? 1 : -1;
    savePosts();
    renderPosts(searchInput.value);
  }

  if (commentButton) showToast("Comments will be added in a future update.");

  if (shareButton) {
    const post = posts.find(item => item.id === shareButton.dataset.share);
    if (!post) return;
    const shareText = `${post.name}: ${post.text}`;
    try {
      if (navigator.share) await navigator.share({ title: "Vibe post", text: shareText });
      else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        showToast("Post text copied.");
      } else showToast("Sharing is not available in this browser.");
    } catch {
      showToast("Sharing was cancelled.");
    }
  }
});

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => setView(button.dataset.view));
});
document.querySelectorAll("[data-open-view]").forEach(button => {
  button.addEventListener("click", () => setView(button.dataset.openView));
});
document.getElementById("backHome").addEventListener("click", () => setView("home"));
document.getElementById("profileButton").addEventListener("click", () => setView("profile"));
document.getElementById("sidebarCreate").addEventListener("click", () => {
  setView("home");
  postInput.focus();
});
searchInput.addEventListener("input", () => {
  setView("home");
  renderPosts(searchInput.value);
});
document.querySelectorAll("[data-search]").forEach(button => {
  button.addEventListener("click", () => {
    searchInput.value = button.dataset.search;
    setView("home");
    renderPosts(searchInput.value);
  });
});
document.getElementById("themeButton").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  showToast(document.body.classList.contains("dark") ? "Dark theme on." : "Light theme on.");
});

renderPosts();
