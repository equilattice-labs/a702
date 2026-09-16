<script setup>
import {
  ref,
  computed,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount,
} from "vue";
import { useMissions, validateMissionForm } from "./composables/useMissions";
import UiIcon from "./components/UiIcon.vue";
import ResearchCover from "./components/ResearchCover.vue";
import MissionCard from "./components/MissionCard.vue";
import { amountText } from "./utils/format";
const {
  account,
  walletError,
  connecting,
  busy,
  notice,
  noticeKind,
  canUndoSavedChange,
  activeView,
  search,
  activeCategory,
  selected,
  createOpen,
  guideOpen,
  mobileNav,
  txHash,
  missionForm,
  evidence,
  contribution,
  contributions,
  claimableAmount,
  walletBalance,
  configured,
  shortAccount,
  correctChain,
  topics,
  missionItems,
  filtered,
  savedCount,
  sortBy,
  loading,
  loadError,
  contributionsLoading,
  contributionsError,
  statsLoading,
  statsError,
  txStatus,
  txError,
  activeTransaction,
  formErrors,
  selectedIsCreator,
  selectedIsOpen,
  selectedCanRefund,
  notify,
  dismissNotice,
  saveMission,
  undoSavedChange,
  scrollTo,
  connectWallet,
  switchNetwork,
  openCreate,
  refreshMissions,
  loadContributions,
  transact,
  closeModal,
  isSaved,
  safeExternalUrl,
  explorerLink,
  resetFilters,
  refreshAll,
} = useMissions();
const logo = `${import.meta.env.BASE_URL}inquedra-mark.svg`;
const detailTab = ref("Brief"),
  createStep = ref(1),
  rewardsOpen = ref(false),
  dialog = ref(null);
const approvalAmounts = ref({}),
  approvingId = ref(null);
const mobileMedia = matchMedia("(max-width: 760px)"),
  isMobile = ref(mobileMedia.matches);
const modalOpen = computed(
  () =>
    !!(
      selected.value ||
      createOpen.value ||
      guideOpen.value ||
      rewardsOpen.value
    ),
);
const modalTitle = computed(() =>
  selected.value
    ? selected.value.title
    : createOpen.value
      ? "Create a mission"
      : rewardsOpen.value
        ? "Your rewards"
        : "The contributor guide",
);
const topicIcons = {
  "All topics": "grid",
  "Tokenized assets": "layers",
  Ecosystem: "network",
  "Market structure": "chart",
  "Risk research": "shield",
};
const viewLabel = (view) =>
  ({ "All missions": "Explore", Saved: "Saved", "My activity": "My missions" })[
    view
  ] || view;
const topicColors = {
  "Tokenized assets": "sage",
  Ecosystem: "lavender",
  "Market structure": "sand",
  "Risk research": "blue",
};
const anyFilters = computed(
  () => !!search.value || activeCategory.value !== "All topics",
);
const featuredMission = computed(() => missionItems.value[0] || null);
const topicCount = (topic) => missionItems.value.filter(m => topic === 'All topics' || m.category === topic).length;
async function clearSearch() {
  search.value = "";
  await nextTick();
  document.querySelector(".search-field input")?.focus();
}
async function handleDetailKey(event) {
  const tabs = ["Brief", "Contribute", "Review"];
  const current = tabs.indexOf(detailTab.value);
  const positions = {
    ArrowRight: (current + 1) % 3,
    ArrowLeft: (current + 2) % 3,
    Home: 0,
    End: 2,
  };
  if (!(event.key in positions)) return;
  event.preventDefault();
  detailTab.value = tabs[positions[event.key]];
  await nextTick();
  document.getElementById(`detail-tab-${detailTab.value}`)?.focus();
}
const minimumDate = new Date(
  Date.now() + 60_000 - new Date().getTimezoneOffset() * 60_000,
)
  .toISOString()
  .slice(0, 16);
let previousFocus, navigationFocus;
function closeAll() {
  if (busy.value) {
    notify("Your transaction is still in progress. Follow its status here.");
    return;
  }
  closeModal();
  rewardsOpen.value = false;
}
function resetTransactionFeedback() {
  if (!busy.value) {
    txError.value = "";
    txHash.value = "";
    txStatus.value = "idle";
    dismissNotice();
  }
}
function openDetails(m) {
  resetTransactionFeedback();
  detailTab.value = "Brief";
  selected.value = m;
}
function navigate(view) {
  activeView.value = view;
  mobileNav.value = false;
  scrollTo("missions");
}
function startCreate() {
  resetTransactionFeedback();
  createStep.value = 1;
  mobileNav.value = false;
  openCreate();
}
function openGuide() {
  resetTransactionFeedback();
  mobileNav.value = false;
  guideOpen.value = true;
}
function openRewards() {
  resetTransactionFeedback();
  mobileNav.value = false;
  rewardsOpen.value = true;
}
function resetSearch() {
  search.value = "";
  activeCategory.value = "All topics";
}
function backToTop() {
  window.scrollTo({
    top: 0,
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth",
  });
}
async function approveResearch(id) {
  approvingId.value = id;
  await transact("approve", id, approvalAmounts.value[id]);
}
function updateMobile(event) {
  isMobile.value = event.matches;
  if (!event.matches) mobileNav.value = false;
}
function handleNavigationKey(event) {
  if (!modalOpen.value && !mobileNav.value) return;
  if (event.key === "Escape" && mobileNav.value) mobileNav.value = false;
  if (event.key !== "Tab") return;
  const surface = modalOpen.value
    ? dialog.value
    : document.querySelector(".sidebar");
  if (!surface) return;
  const buttons = [
    ...surface.querySelectorAll(
      "a[href], button, input, select, textarea, [tabindex]",
    ),
  ].filter(
    (el) => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length,
  );
  const first = buttons[0],
    last = buttons.at(-1);
  if (!first) {
    event.preventDefault();
    return;
  }
  if (
    event.shiftKey &&
    (document.activeElement === first ||
      !surface.contains(document.activeElement))
  ) {
    event.preventDefault();
    last.focus();
  } else if (
    !event.shiftKey &&
    (document.activeElement === last ||
      !surface.contains(document.activeElement))
  ) {
    event.preventDefault();
    first.focus();
  }
}
async function reviewDraft() {
  const result = validateMissionForm(missionForm.value);
  formErrors.value = result.errors;
  if (!Object.keys(result.errors).length) {
    createStep.value = 2;
    await nextTick();
    dialog.value?.scrollTo({ top: 0 });
    dialog.value?.querySelector(".review-mission h3")?.focus();
  } else {
    await nextTick();
    dialog.value?.querySelector('[aria-invalid="true"]')?.focus();
  }
}
async function editDraft() {
  createStep.value = 1;
  await nextTick();
  document.getElementById("mission-title")?.focus();
}
async function showContribute() {
  detailTab.value = "Contribute";
  await nextTick();
  document.getElementById("evidence-uri")?.focus();
}
function downloadBrief() {
  const f = missionForm.value;
  const text = `# ${f.title || "Untitled research mission"}\n\nInquedra · ${f.category}\n\n## Research brief\n${f.description || "Add scope, primary sources and acceptance criteria here."}\n\n## Submission deadline\n${f.deadline || "To be set"}\n\n## Reward pool\n${f.reward || "0"} testnet ETH\n\nPublished brief: ${f.uri || "Add a public URL after hosting this file."}\n\nThe mission creator reviews submissions. A submission does not guarantee a reward. Testnet ETH has no intended monetary value.\n`;
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/markdown;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "inquedra-research-brief.md";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify(
    "Brief downloaded. Publish it, then add its public URL before funding your mission.",
  );
}
watch(modalOpen, async (open) => {
  if (open) {
    previousFocus = document.activeElement;
    mobileNav.value = false;
    await nextTick();
    dialog.value?.showModal();
    document.body.style.overflow = "hidden";
  } else {
    dialog.value?.close();
    document.body.style.overflow = "";
    await nextTick();
    if (previousFocus?.isConnected && previousFocus.getClientRects().length)
      previousFocus.focus();
    else if (isMobile.value) document.querySelector(".mobile-menu")?.focus();
  }
});
watch(selected, (m, previous) => {
  if (m?.key !== previous?.key) {
    detailTab.value = "Brief";
    approvalAmounts.value = {};
  }
});
watch(mobileNav, async (open) => {
  document.body.style.overflow = open || modalOpen.value ? "hidden" : "";
  if (open) {
    navigationFocus = document.activeElement;
    await nextTick();
    document.querySelector(".sidebar button")?.focus();
  } else {
    await nextTick();
    if (!modalOpen.value && navigationFocus?.isConnected)
      navigationFocus.focus();
  }
});
onMounted(() => {
  mobileMedia.addEventListener("change", updateMobile);
  document.addEventListener("keydown", handleNavigationKey);
});
onBeforeUnmount(() => {
  document.body.style.overflow = "";
  mobileMedia.removeEventListener("change", updateMobile);
  document.removeEventListener("keydown", handleNavigationKey);
});
</script>

<template>
  <div class="app-shell">
    <a :inert="isMobile && mobileNav" class="skip-link" href="#missions"
      >Skip to research missions</a
    >
    <header class="topbar" :inert="isMobile && mobileNav">
      <div class="header-inner">
        
        <a
          class="brand"
          href="#"
          @click="
            backToTop();
            mobileNav = false;
          "
          aria-label="Inquedra home"
          ><img :src="logo" alt="" width="36" height="36" /><span
            >Inquedra</span
          ></a
        >
        <div class="workspace-breadcrumb"><span>Workspace</span><UiIcon name="chevron" :size="13" /><strong>{{ viewLabel(activeView) }}</strong></div>
        <div class="topbar-actions">
          <span class="network-pill"
            ><span class="status-dot"></span>Robinhood Chain
            <span class="testnet-badge">Testnet</span></span
          ><button
            class="button wallet-button secondary"
            :aria-label="
              connecting
                ? 'Connecting wallet'
                : account
                  ? 'Open your rewards'
                  : 'Connect wallet'
            "
            :disabled="connecting"
            @click="account ? openRewards() : connectWallet()"
          >
            <UiIcon name="wallet" :size="17" /><span>{{
              connecting ? "Connecting…" : shortAccount
            }}</span></button
          ><button
            class="icon-button mobile-menu"
            @click="mobileNav = !mobileNav"
            :aria-expanded="mobileNav"
            aria-controls="mobile-navigation"
            aria-label="Toggle navigation"
          >
            <UiIcon :name="mobileNav ? 'close' : 'menu'" />
          </button>
        </div>
      </div>
    </header>
    <button
      v-if="mobileNav"
      class="sidebar-backdrop"
      aria-label="Close navigation"
      @click="mobileNav = false"
    ></button>
    <aside
      id="mobile-navigation"
      class="sidebar"
      :class="{ 'is-open': mobileNav }"
      aria-label="Workspace navigation"
      :inert="isMobile && !mobileNav"
    >
      <a class="brand rail-brand" href="#" @click="backToTop(); mobileNav = false" aria-label="Inquedra home"><img :src="logo" alt="" width="38" height="38" /><span>Inquedra<span class="brand-subtitle">OPEN RESEARCH</span></span></a>
      <div class="mobile-nav-heading">
        <span class="eyebrow">WORKSPACE</span
        ><button
          class="icon-button"
          @click="mobileNav = false"
          aria-label="Close menu"
        >
          <UiIcon name="close" />
        </button>
      </div>
      <span class="rail-section-label">RESEARCH SPACE</span>
      <nav>
        <button
          v-for="view in ['All missions', 'Saved', 'My activity']"
          :key="view"
          :class="{ active: activeView === view }"
          :aria-current="activeView === view ? 'page' : undefined"
          @click="navigate(view)"
        >
          <UiIcon :name="view === 'All missions' ? 'grid' : view === 'Saved' ? 'bookmark' : 'activity'" :size="18" />{{ viewLabel(view) }}<span v-if="view === 'Saved' && savedCount" class="nav-count">{{ savedCount }}</span></button
        ><button @click="openRewards">
          <UiIcon name="wallet" :size="18" />Your rewards</button
        ><button @click="openGuide">
          <UiIcon name="book" :size="18" />Contributor guide
        </button>
      </nav>
      <button class="button primary full" @click="startCreate">
        Create a mission<UiIcon name="plus" :size="18" />
      </button>
      <div class="rail-footnote"><span class="rail-orbit" aria-hidden="true">↗</span><h2>Every insight<br />starts somewhere.</h2><p>Ask clearly. Investigate openly. Move knowledge forward.</p><span class="rail-network"><span class="status-dot"></span>ROBINHOOD CHAIN TESTNET</span></div>
    </aside>
    <div class="workspace" :inert="isMobile && mobileNav">
      <main id="main-content" class="main-content">
        <ResearchCover
          :mission="featuredMission"
          :loading="loading"
          :error="loadError"
          @explore="scrollTo('missions')"
          @create="startCreate"
          @open="openDetails"
          @retry="refreshMissions"
        />
        <section
          id="missions"
          class="mission-board"
          aria-labelledby="board-title"
          tabindex="-1"
        >
          <div class="section-heading">
            <div>
              <div class="eyebrow">YOUR NEXT LINE OF INQUIRY</div>
              <h2 id="board-title">
                {{
                  activeView === "Saved"
                    ? "Your saved missions"
                    : activeView === "My activity"
                      ? "Your missions"
                      : "Research missions"
                }}<span class="count-chip">{{
                  filtered.length.toString().padStart(2, "0")
                }}</span>
              </h2>
            </div>
            <button class="button primary" aria-label="Create mission" @click="startCreate">
              <UiIcon name="plus" :size="17" /><span>Create mission</span>
            </button>
          </div>
          <div class="board-layout">
            <div class="board-main">
              <div class="board-toolbar">
                <div class="board-tabs" aria-label="Mission views">
                  <button
                    v-for="view in ['All missions', 'Saved', 'My activity']"
                    :key="view"
                    :class="{ active: activeView === view }"
                    :aria-pressed="activeView === view"
                    @click="activeView = view"
                  >
                    {{
                      view === "All missions"
                        ? "All missions"
                        : viewLabel(view)
                    }}<span v-if="view === 'Saved' && savedCount">{{
                      savedCount
                    }}</span>
                  </button>
                </div>
                <div class="board-tools">
                  <div class="search-field">
                    <UiIcon name="search" :size="18" /><input
                      v-model="search"
                      type="search"
                      placeholder="Find a topic or question"
                      aria-label="Search missions"
                    /><button
                      v-if="search"
                      class="search-clear"
                      type="button"
                      aria-label="Clear search"
                      @click="clearSearch"
                    >
                      <UiIcon name="close" :size="16" />
                    </button>
                  </div>
                  <label class="sort-field"
                    ><span class="sr-only">Sort missions</span
                    ><select v-model="sortBy" aria-label="Sort missions">
                      <option value="recommended">Recommended</option>
                      <option value="newest">Newest first</option>
                      <option value="reward">Highest reward</option>
                      <option value="deadline">Closing soon</option>
                    </select></label
                  >
                </div>
              </div>
              <aside class="board-sidebar" aria-label="Research topics">
                <span class="eyebrow">RESEARCH TOPICS</span>
                <div class="filter-row" aria-label="Filter by topic">
                  <button
                    v-for="topic in topics"
                    :key="topic"
                    :class="{ active: activeCategory === topic }"
                    :aria-pressed="activeCategory === topic"
                    @click="activeCategory = topic"
                  >
                    <UiIcon :name="topicIcons[topic] || 'book'" :size="17" />{{
                      topic
                    }}<span class="topic-count" aria-hidden="true">{{ topicCount(topic) }}</span>
                  </button>
                </div>
              </aside>
              <div
                v-if="anyFilters"
                class="active-filters"
                aria-label="Applied filters"
              >
                <span>Showing results for</span>
                <button
                  v-if="activeCategory !== 'All topics'"
                  aria-label="Remove topic filter"
                  @click="activeCategory = 'All topics'"
                >
                  {{ activeCategory }}<UiIcon name="close" :size="13" />
                </button>
                <button
                  v-if="search"
                  aria-label="Remove search filter"
                  @click="clearSearch"
                >
                  “{{ search }}”<UiIcon name="close" :size="13" />
                </button>
                <button class="reset-all" @click="resetSearch">
                  Reset all
                </button>
              </div>
              <div v-if="!configured" class="preview-notice">
                <UiIcon name="info" :size="17" />
                <p>
                  <strong>You’re exploring the preview.</strong> Sample
                  missions, illustrative rewards. No transactions.
                </p>
                <button @click="openGuide">
                  About this preview<UiIcon name="arrow" :size="15" />
                </button>
              </div>
              <div v-if="loading" class="loading-state" role="status">
                <span class="spinner"></span>Loading research missions…
                <div class="skeleton-grid">
                  <div v-for="n in 4" :key="n" class="skeleton-row"></div>
                </div>
              </div>
              <div
                v-else-if="loadError"
                class="empty-state error-state"
                role="alert"
              >
                <UiIcon name="info" :size="32" />
                <h3>The board couldn’t load.</h3>
                <p>{{ loadError }}</p>
                <button class="button secondary" @click="refreshMissions">
                  <UiIcon name="refresh" :size="16" />Try again
                </button>
              </div>
              <div
                v-else-if="filtered.length"
                class="mission-list"
                aria-label="Research missions"
              >
                <MissionCard
                  v-for="(m, index) in filtered"
                  :key="m.key || m.id"
                  :mission="m"
                  :index="index"
                  :saved="isSaved(m)"
                  :icon="topicIcons[m.category]"
                  :tone="topicColors[m.category]"
                  @open="openDetails"
                  @save="saveMission"
                />
              </div>
              <div v-else class="empty-state">
                <UiIcon
                  :name="activeView === 'Saved' ? 'bookmark' : 'search'"
                  :size="32"
                />
                <h3>
                  {{
                    anyFilters
                      ? "No matching missions. Yet."
                      : activeView === "Saved"
                        ? "Keep your next question close."
                        : activeView === "My activity"
                          ? "Make room for your next idea."
                          : "The next question could be yours."
                  }}
                </h3>
                <p>
                  {{
                    anyFilters
                      ? "Try a different search or clear your topic filters."
                      : activeView === "Saved"
                        ? "Save a mission from the board and pick it up here, on this device."
                        : activeView === "My activity"
                          ? account
                            ? "Missions you create with this wallet will appear here."
                            : "Connect your wallet to find the missions you have created."
                          : "There are no published missions yet. Create a brief to get things started."
                  }}
                </p>
                <button
                  v-if="activeView === 'My activity' && !account && !anyFilters"
                  class="button primary"
                  @click="connectWallet"
                  :disabled="connecting"
                >
                  {{ connecting ? "Connecting…" : "Connect wallet" }}</button
                ><button
                  v-else-if="
                    activeView === 'My activity' && account && !anyFilters
                  "
                  class="button primary"
                  @click="startCreate"
                >
                  Create your first mission<UiIcon
                    name="plus"
                    :size="16"
                  /></button
                ><button
                  v-else
                  class="button secondary"
                  @click="anyFilters ? resetSearch() : resetFilters()"
                >
                  {{ anyFilters ? "Clear filters" : "Explore all missions"
                  }}<UiIcon name="arrow" :size="16" />
                </button>
              </div>
              <div class="board-bottom">
                <span aria-live="polite"
                  >{{ filtered.length }}
                  {{ filtered.length === 1 ? "mission" : "missions"
                  }}{{
                    anyFilters
                      ? " matching your filters"
                      : " to move knowledge forward"
                  }}</span
                ><button
                  v-if="configured"
                  @click="refreshMissions"
                  :disabled="loading"
                >
                  <UiIcon name="refresh" :size="15" />Refresh missions</button
                ><span v-else>TESTNET ETH · NO MONETARY VALUE</span>
              </div>
            </div>
            <aside class="research-notebook" aria-label="Research notes">
              <div class="notebook-heading"><UiIcon name="quill" :size="19" /><span>THE RESEARCH NOTEBOOK</span></div>
              <div class="notebook-intro"><span class="eyebrow">A BETTER STARTING POINT</span><h3>Good questions.<br />Stronger evidence.</h3><p>You don’t need every answer. Start with a clear question and a source others can follow.</p></div>
              <ol class="notebook-checklist"><li><span>01</span><div><strong>Define the unknown</strong><p>One question. A clear scope.</p></div></li><li><span>02</span><div><strong>Follow the source</strong><p>Original evidence over assumptions.</p></div></li><li><span>03</span><div><strong>Show your reasoning</strong><p>Make your findings reproducible.</p></div></li></ol>
              <div class="board-help"><p>Make your next contribution count.</p><button class="text-button" @click="openGuide">Contributor guide<UiIcon name="arrow" :size="16" /></button></div>
              <div class="notebook-create"><UiIcon name="plus" :size="22" /><h3>A question of your own?</h3><p>Set the direction. Invite others to investigate.</p><button class="button secondary full" @click="startCreate">Create a mission<UiIcon name="arrow" :size="16" /></button></div>
              <span class="notebook-footer">OPEN QUESTIONS. SHARED PROGRESS.</span>
            </aside>
          </div>
        </section>
        <section
          id="how-it-works"
          class="how-section"
          aria-labelledby="how-title"
        >
          <div class="section-heading">
            <div>
              <div class="eyebrow">HOW INQUEDRA WORKS</div>
              <h2 id="how-title">A clear path from question to contribution.</h2>
            </div>
            <button class="text-button" @click="openGuide">
              Read the contributor guide<UiIcon name="arrow" :size="17" />
            </button>
          </div>
          <div class="workflow-grid">
            <article>
              <span class="step-label">01 / ASK</span
              ><UiIcon name="plus" :size="28" />
              <h3>Start with a good question.</h3>
              <p>
                Write a focused brief, set a deadline, and fund a testnet reward
                pool. Give the work a clear direction.
              </p>
            </article>
            <article>
              <span class="step-label">02 / INVESTIGATE</span
              ><UiIcon name="search" :size="28" />
              <h3>Bring the evidence.</h3>
              <p>
                Follow primary sources. Publish your findings, explain the
                limitations, and submit your research URL.
              </p>
            </article>
            <article>
              <span class="step-label">03 / ADVANCE</span
              ><UiIcon name="arrow" :size="28" />
              <h3>Recognize useful work.</h3>
              <p>
                The creator reviews evidence and allocates rewards before the
                deadline. Contributors claim their testnet ETH.
              </p>
            </article>
          </div>
        </section>
        <section class="faq-section" aria-labelledby="faq-title">
          <div>
            <div class="eyebrow">A FEW THINGS TO KNOW</div>
            <h2 id="faq-title">Clarity comes first.</h2>
            <p>Know the process before<br />you put in the work.</p>
            <button class="text-button" @click="openRewards">
              View your rewards<UiIcon name="wallet" :size="17" />
            </button>
          </div>
          <div class="faqs">
            <details>
              <summary>
                Who reviews the research?<UiIcon name="plus" :size="18" />
              </summary>
              <p>
                The mission creator decides which contributions meet the
                published brief. Read the scope and acceptance criteria before
                you begin; submitting work does not guarantee a reward.
              </p>
            </details>
            <details>
              <summary>
                What do testnet rewards mean?<UiIcon name="plus" :size="18" />
              </summary>
              <p>
                Rewards use testnet ETH, which has no intended monetary value.
                Inquedra has no platform token, investment return, or guaranteed
                payout.
              </p>
            </details>
            <details>
              <summary>
                What happens to unused funds?<UiIcon name="plus" :size="18" />
              </summary>
              <p>
                After the deadline, the mission creator can move the unallocated
                balance to their claimable rewards, then withdraw it. Additional
                funders do not receive an individual refund under the current
                contract.
              </p>
            </details>
            <details>
              <summary>
                Is Inquedra affiliated with Robinhood?<UiIcon
                  name="plus"
                  :size="18"
                />
              </summary>
              <p>
                Inquedra is an independent project built for Robinhood Chain. It
                is not affiliated with, endorsed by, or operated by Robinhood
                Markets, Inc. Research is educational, not investment advice.
              </p>
            </details>
          </div>
        </section>
        <footer class="footer">
          <div>
            <a class="brand" href="#" @click="backToTop"
              ><img :src="logo" alt="" width="29" height="29" />Inquedra</a
            ><span>Find the question. Build the evidence.</span>
          </div>
          <p>© 2026 Inquedra<br />Open research. Traceable evidence.</p>
          <button class="text-button" @click="backToTop">Back to top ↑</button>
        </footer>
      </main>
    </div>
    <dialog
      ref="dialog"
      class="modal"
      :class="{ 'detail-drawer': selected }"
      aria-labelledby="dialog-title"
      @cancel.prevent="closeAll"
      @click="(event) => event.target === dialog && closeAll()"
    >
      <div v-if="modalOpen" class="modal-content">
        <div class="dialog-topline">
          <span class="eyebrow">{{
            selected
              ? selected.sample
                ? "SAMPLE RESEARCH BRIEF"
                : `MISSION / ${selected.id}`
              : createOpen
                ? `NEW MISSION / STEP ${createStep} OF 2`
                : rewardsOpen
                  ? "YOUR WORK, RECOGNIZED"
                  : "THE CONTRIBUTOR GUIDE"
          }}</span
          ><button
            class="icon-button"
            @click="closeAll"
            aria-label="Close dialog"
            :disabled="busy"
            autofocus
          >
            <UiIcon name="close" />
          </button>
        </div>
        <h2 id="dialog-title">{{ modalTitle }}</h2>
        <div v-if="walletError" class="message error" role="alert">
          {{ walletError
          }}<button
            class="text-button"
            @click="connectWallet"
            :disabled="connecting"
          >
            Try connecting again
          </button>
        </div>
        <template v-if="selected"
          ><div class="detail-tags">
            <span class="category-tag">{{ selected.category }}</span
            ><span class="status-tag">{{
              selected.sample ? "Preview" : selected.status
            }}</span
            ><button
              class="text-button save-detail"
              @click="saveMission(selected)"
              :aria-pressed="isSaved(selected)"
            >
              <UiIcon name="bookmark" :size="16" />{{
                isSaved(selected) ? "Saved" : "Save brief"
              }}
            </button>
          </div>
          <div v-if="notice && noticeKind === 'bookmark'" class="message neutral bookmark-feedback" role="status">
            <p>{{ notice }}</p>
            <button v-if="canUndoSavedChange" class="text-button toast-undo" @click="undoSavedChange">Undo</button>
            <button class="icon-button" @click="dismissNotice" aria-label="Dismiss notification"><UiIcon name="close" :size="16" /></button>
          </div>
          <div class="detail-stats">
            <div>
              <span>{{
                selected.sample ? "ILLUSTRATIVE REWARD" : "AVAILABLE REWARD"
              }}</span
              ><strong
                >{{
                  selected.sample ? selected.reward : selected.availableReward
                }}
                <small>ETH</small></strong
              >
            </div>
            <div>
              <span>SUBMISSION DEADLINE</span
              ><strong class="deadline-text">{{
                selected.sample ? "Sample mission" : selected.deadline
              }}</strong>
            </div>
          </div>
          <div v-if="selected.sample" class="message neutral">
            <UiIcon name="info" :size="18" />
            <p>
              This is a sample brief. Rewards are illustrative; this mission
              does not accept transactions.
            </p>
          </div>
          <div
            class="board-tabs detail-tabs"
            role="tablist"
            aria-label="Mission sections"
            @keydown="handleDetailKey"
          >
            <button
              v-for="tab in ['Brief', 'Contribute', 'Review']"
              :key="tab"
              :id="`detail-tab-${tab}`"
              role="tab"
              :aria-controls="`detail-panel-${tab}`"
              :class="{ active: detailTab === tab }"
              :aria-selected="detailTab === tab"
              :tabindex="detailTab === tab ? 0 : -1"
              @click="detailTab = tab"
            >
              {{ tab
              }}<span v-if="tab === 'Review'">{{ contributions.length }}</span>
            </button>
          </div>
          <div
            v-show="detailTab === 'Brief'"
            id="detail-panel-Brief"
            class="detail-section"
            role="tabpanel"
            aria-labelledby="detail-tab-Brief"
            tabindex="0"
          >
            <h3>The question</h3>
            <p>{{ selected.brief || selected.description }}</p>
            <a
              v-if="safeExternalUrl(selected.descriptionURI)"
              :href="safeExternalUrl(selected.descriptionURI)"
              target="_blank"
              rel="noopener noreferrer"
              class="button secondary"
              >Read the public brief<UiIcon name="external" :size="16"
            /></a>
            <h3>What to deliver</h3>
            <ul class="deliverables">
              <li v-for="line in selected.deliverables" :key="line">
                <UiIcon name="check" :size="17" />{{ line }}
              </li>
            </ul>
            <div class="brief-note">
              <UiIcon name="book" :size="20" />
              <div>
                <strong>Make your research verifiable.</strong>
                <p>
                  Cite primary sources. Separate facts from interpretation. Make
                  your limitations as clear as your findings.
                </p>
              </div>
            </div>
            <div v-if="selected.creator" class="creator-line">
              <span>Mission creator</span><code>{{ selected.creator }}</code>
            </div>
            <button class="button primary full" @click="showContribute">
              Explore contribution options<UiIcon name="arrow" :size="17" />
            </button>
          </div>
          <div
            v-show="detailTab === 'Contribute'"
            id="detail-panel-Contribute"
            class="detail-section"
            role="tabpanel"
            aria-labelledby="detail-tab-Contribute"
            tabindex="0"
          >
            <div
              v-if="!selected.sample && !selectedIsOpen"
              class="message neutral"
            >
              This mission is
              {{ selected.closed ? "closed" : "past its deadline" }}. New
              funding and submissions are unavailable.
            </div>
            <form class="action-form" @submit.prevent="transact('submit')">
              <h3>Share your research</h3>
              <p>
                Publish your findings, then link the evidence for the creator to
                review.
              </p>
              <label for="evidence-uri">Public evidence URL</label
              ><input
                id="evidence-uri"
                v-model="evidence"
                placeholder="https://… or ipfs://…"
                :aria-invalid="!!formErrors.evidence"
                :aria-describedby="
                  formErrors.evidence
                    ? 'evidence-help evidence-error'
                    : 'evidence-help'
                "
                required
              /><small id="evidence-help"
                >Use a permanent public URL. Keep personal information
                off-chain.</small
              >
              <p
                id="evidence-error"
                v-if="formErrors.evidence"
                class="field-error"
              >
                {{ formErrors.evidence }}
              </p>
              <button
                class="button primary"
                :disabled="selected.sample || !selectedIsOpen || busy"
              >
                {{
                  activeTransaction === "submit" && busy
                    ? "Submitting…"
                    : "Submit research"
                }}<UiIcon name="arrow" :size="16" />
              </button>
            </form>
            <form class="action-form" @submit.prevent="transact('fund')">
              <h3>Back the question</h3>
              <p>
                Add to the reward pool. The creator controls allocations and any
                unspent balance after the deadline.
              </p>
              <label for="fund-amount">Contribution · testnet ETH</label
              ><input
                id="fund-amount"
                v-model="contribution"
                inputmode="decimal"
                placeholder="0.01"
                :aria-invalid="!!formErrors.contribution"
                :aria-describedby="
                  formErrors.contribution ? 'fund-error' : undefined
                "
                required
              />
              <p
                id="fund-error"
                v-if="formErrors.contribution"
                class="field-error"
              >
                {{ formErrors.contribution }}
              </p>
              <button
                class="button secondary"
                :disabled="selected.sample || !selectedIsOpen || busy"
              >
                {{
                  activeTransaction === "fund" && busy
                    ? "Funding…"
                    : "Fund this mission"
                }}<UiIcon name="plus" :size="16" />
              </button>
            </form>
          </div>
          <div
            v-show="detailTab === 'Review'"
            id="detail-panel-Review"
            class="detail-section"
            role="tabpanel"
            aria-labelledby="detail-tab-Review"
            tabindex="0"
          >
            <h3>Evidence &amp; creator review</h3>
            <p>
              Submissions remain public. The mission creator decides which work
              earns a reward.
            </p>
            <div
              v-if="contributionsLoading"
              class="message neutral"
              role="status"
            >
              <span class="spinner"></span>Loading contributions…
            </div>
            <div
              v-else-if="contributionsError"
              class="message error"
              role="alert"
            >
              {{ contributionsError
              }}<button class="text-button" @click="loadContributions">
                Try again
              </button>
            </div>
            <div v-else-if="!contributions.length" class="review-empty">
              <UiIcon name="book" :size="26" />
              <h4>No research submitted yet.</h4>
              <p>
                {{
                  selected.sample
                    ? "This sample shows what a research brief looks like."
                    : "The first source could start a bigger conversation."
                }}
              </p>
            </div>
            <article
              v-for="(c, i) in contributions"
              :key="c.id ?? i"
              class="contribution-card"
            >
              <div class="mission-meta">
                <span>CONTRIBUTION {{ i + 1 }}</span
                ><span>{{
                  c.approvedByCreator ? "Approved" : "Pending review"
                }}</span>
              </div>
              <a
                v-if="safeExternalUrl(c.evidenceURI)"
                :href="safeExternalUrl(c.evidenceURI)"
                target="_blank"
                rel="noopener noreferrer"
                >{{ c.evidenceURI }}<UiIcon name="external" :size="14"
              /></a>
              <p v-else>
                Evidence URL is unavailable or uses an unsupported protocol.
              </p>
              <div class="creator-line">
                <span>Contributor / reward recipient</span
                ><code>{{ c.contributor }}</code>
              </div>
              <p v-if="c.approvedByCreator">
                Allocated reward: {{ c.approved }} testnet ETH
              </p>
              <form
                v-if="selectedIsCreator && !c.approvedByCreator"
                @submit.prevent="approveResearch(c.id ?? i)"
              >
                <label :for="`approval-${i}`"
                  >Reward allocation · testnet ETH</label
                >
                <div class="inline-form">
                  <input
                    :id="`approval-${i}`"
                    :aria-invalid="
                      !!formErrors.approval && approvingId === (c.id ?? i)
                    "
                    :aria-describedby="
                      formErrors.approval && approvingId === (c.id ?? i)
                        ? `approval-error-${i}`
                        : undefined
                    "
                    v-model="approvalAmounts[c.id ?? i]"
                    inputmode="decimal"
                    placeholder="0.01"
                    required
                  /><button
                    class="button primary"
                    :disabled="busy || !selectedIsOpen"
                  >
                    Approve
                  </button>
                </div>
                <p
                  :id="`approval-error-${i}`"
                  class="field-error"
                  v-if="formErrors.approval && approvingId === (c.id ?? i)"
                >
                  {{ formErrors.approval }}
                </p>
              </form>
            </article>
            <div
              v-if="selectedIsCreator && !selected.sample"
              class="refund-panel"
            >
              <h3>Unallocated funds</h3>
              <p>
                After the deadline, return any unallocated balance to your
                claimable rewards. Then withdraw it from Your rewards.
              </p>
              <button
                class="button secondary"
                :disabled="!selectedCanRefund || busy"
                @click="transact('refund')"
              >
                Return unallocated funds</button
              ><small v-if="!selectedCanRefund"
                >Available to the creator after the deadline, before
                refunding.</small
              >
            </div>
          </div>
        </template>
        <template v-else-if="createOpen"
          ><p class="dialog-intro">
            A focused question is the start of something useful.
          </p>
          <div class="create-progress" aria-label="Creation progress">
            <span :class="{ active: createStep === 1 }"
              >01 &nbsp; Shape the brief</span
            ><UiIcon name="arrow" :size="16" /><span
              :class="{ active: createStep === 2 }"
              >02 &nbsp; Review &amp; fund</span
            >
          </div>
          <form
            v-if="createStep === 1"
            class="create-form"
            @submit.prevent="reviewDraft"
          >
            <label for="mission-title">What would you like to understand?</label
            ><input
              id="mission-title"
              :aria-invalid="!!formErrors.title"
              :aria-describedby="formErrors.title ? 'error-title' : undefined"
              v-model="missionForm.title"
              maxlength="96"
              placeholder="Give your research question a clear title"
              required
            /><small>Up to 96 UTF-8 bytes. Keep the question focused.</small
            ><label for="mission-topic">Research topic</label
            ><select id="mission-topic" v-model="missionForm.category">
              <option v-for="topic in topics.slice(1)" :key="topic">
                {{ topic }}
              </option></select
            ><label for="mission-draft"
              >Your working brief
              <span class="optional"
                >optional · stays in this page until you leave</span
              ></label
            ><textarea
              id="mission-draft"
              v-model="missionForm.description"
              rows="4"
              placeholder="Define the question, scope, primary sources, and what an accepted contribution should include."
            ></textarea
            ><button
              class="text-button download-draft"
              type="button"
              @click="downloadBrief"
            >
              <UiIcon name="download" :size="16" />Download your brief
            </button>
            <div class="field-note-inline">
              Publish your brief on a public host, then paste its URL below.
              Draft text is not uploaded or stored on-chain by Inquedra.
            </div>
            <label for="brief-uri">Public brief URL</label
            ><input
              id="brief-uri"
              :aria-invalid="!!formErrors.uri"
              :aria-describedby="formErrors.uri ? 'error-uri' : undefined"
              v-model="missionForm.uri"
              placeholder="https://… or ipfs://…"
              required
            />
            <div class="form-row">
              <div>
                <label for="mission-reward">Reward pool · testnet ETH</label
                ><input
                  id="mission-reward"
                  :aria-invalid="!!formErrors.reward"
                  :aria-describedby="
                    formErrors.reward ? 'error-reward' : undefined
                  "
                  v-model="missionForm.reward"
                  inputmode="decimal"
                  placeholder="0.05"
                  required
                />
              </div>
              <div>
                <label for="mission-deadline">Deadline · your local time</label
                ><input
                  id="mission-deadline"
                  :aria-invalid="!!formErrors.deadline"
                  :aria-describedby="
                    formErrors.deadline ? 'error-deadline' : undefined
                  "
                  v-model="missionForm.deadline"
                  type="datetime-local"
                  :min="minimumDate"
                  required
                />
              </div>
            </div>
            <ul
              v-if="Object.keys(formErrors).length"
              class="field-error"
              role="alert"
            >
              <li
                v-for="(error, field) in formErrors"
                :key="field"
                :id="`error-${field}`"
              >
                {{ error }}
              </li>
            </ul>
            <button class="button primary full" type="submit">
              Review your mission<UiIcon name="arrow" :size="17" />
            </button>
          </form>
          <div v-else class="review-mission">
            <span class="category-tag">{{ missionForm.category }}</span>
            <h3 tabindex="-1">{{ missionForm.title }}</h3>
            <dl>
              <div>
                <dt>Public brief</dt>
                <dd>
                  <a
                    v-if="safeExternalUrl(missionForm.uri)"
                    :href="safeExternalUrl(missionForm.uri)"
                    target="_blank"
                    rel="noopener noreferrer"
                    >{{ missionForm.uri }} ↗</a
                  ><span v-else>{{ missionForm.uri }}</span>
                </dd>
              </div>
              <div>
                <dt>Initial reward</dt>
                <dd>{{ missionForm.reward }} testnet ETH</dd>
              </div>
              <div>
                <dt>Submission deadline</dt>
                <dd>{{ new Date(missionForm.deadline).toLocaleString() }}</dd>
              </div>
            </dl>
            <p>
              You will fund the reward pool and become this mission’s reviewer.
              Contributors rely on your published scope and acceptance criteria.
            </p>
            <div v-if="!configured" class="message neutral">
              <UiIcon name="info" :size="18" />
              <p>
                Publishing is not available in this preview. Download your draft
                to keep it for later.
              </p>
            </div>
            <ul
              v-if="Object.keys(formErrors).length"
              class="field-error"
              role="alert"
            >
              <li
                v-for="(error, field) in formErrors"
                :key="field"
                :id="`error-${field}`"
              >
                {{ error }}
              </li>
            </ul>
            <div class="dialog-actions">
              <button
                class="button secondary"
                @click="editDraft"
                :disabled="busy"
              >
                <UiIcon name="arrowleft" :size="16" />Edit brief</button
              ><button
                v-if="!configured"
                class="button primary"
                @click="downloadBrief"
              >
                <UiIcon name="download" :size="16" />Download brief</button
              ><button
                v-else
                class="button primary"
                @click="transact('create')"
                :disabled="busy"
              >
                {{ busy ? "Publishing…" : "Publish & fund"
                }}<UiIcon name="arrow" :size="16" />
              </button>
            </div></div
        ></template>
        <template v-else-if="rewardsOpen"
          ><p class="dialog-intro">
            A clear view of the work you’ve earned rewards for.
          </p>
          <div v-if="!account" class="empty-state">
            <UiIcon name="wallet" :size="35" />
            <h3>Connect to see your rewards.</h3>
            <p>
              Use the wallet you contributed with on Robinhood Chain testnet.
            </p>
            <button
              class="button primary"
              @click="connectWallet"
              :disabled="connecting"
            >
              {{ connecting ? "Connecting…" : "Connect wallet" }}
            </button>
          </div>
          <template v-else
            ><code class="account-address">{{ account }}</code>
            <div v-if="!correctChain" class="message neutral">
              <p>
                Switch to Robinhood Chain testnet to view and claim your
                rewards.
              </p>
              <button class="button secondary" @click="switchNetwork">
                Switch network
              </button>
            </div>
            <div v-else-if="statsError" class="message error" role="alert">
              {{ statsError
              }}<button class="text-button" @click="refreshAll">
                Try again
              </button>
            </div>
            <div v-else>
              <div class="reward-balance">
                <span>AVAILABLE TO CLAIM</span
                ><strong :title="claimableAmount + ' ETH'"
                  >{{ statsLoading ? "…" : amountText(claimableAmount) }}
                  <small>ETH</small></strong
                >
                <p>
                  Wallet balance: {{ amountText(walletBalance) }} testnet ETH
                </p>
              </div>
              <p>
                Accepted contributions and returned unallocated funds appear
                here. Claiming sends the balance to your connected wallet.
              </p>
              <button
                class="button primary full"
                @click="transact('claim')"
                :disabled="
                  !configured ||
                  statsLoading ||
                  busy ||
                  Number(claimableAmount) <= 0
                "
              >
                {{
                  busy
                    ? "Claiming…"
                    : Number(claimableAmount) > 0
                      ? "Claim rewards"
                      : "No rewards to claim yet"
                }}<UiIcon name="wallet" :size="17" /></button
              ><button
                class="text-button refresh-rewards"
                @click="refreshAll"
                :disabled="statsLoading || busy"
              >
                <UiIcon name="refresh" :size="15" />Refresh balance
              </button>
            </div></template
          >
          <p class="fine-print">
            Testnet ETH has no intended monetary value.
          </p></template
        >
        <template v-else
          ><p class="dialog-intro">
            Good research starts with clear expectations. Here’s how we make
            useful knowledge together.
          </p>
          <div class="guide-section">
            <span>01</span>
            <div>
              <h3>For the question askers</h3>
              <p>
                Write a narrow research question with specific acceptance
                criteria. Publish the brief at an accessible URL, choose a
                deadline, and fund its testnet reward pool. You review the work
                and allocate rewards before the deadline.
              </p>
            </div>
          </div>
          <div class="guide-section">
            <span>02</span>
            <div>
              <h3>For the evidence seekers</h3>
              <p>
                Read the brief before beginning. Cite original sources,
                distinguish observations from assumptions, and state what
                remains uncertain. Publish your research and submit the public
                URL. The creator decides which work they accept.
              </p>
            </div>
          </div>
          <div class="guide-section">
            <span>03</span>
            <div>
              <h3>For a stronger commons</h3>
              <p>
                Reviewers allocate rewards to accepted contributions.
                Contributors withdraw from Your rewards. A submission is not a
                guaranteed payment; additional funding is not an investment or
                an individually refundable deposit.
              </p>
            </div>
          </div>
          <div class="brief-note">
            <UiIcon name="info" :size="21" />
            <div>
              <strong>{{
                configured
                  ? "An independent testnet project"
                  : "You’re exploring the preview"
              }}</strong>
              <p>
                {{
                  configured
                    ? "Inquedra runs on Robinhood Chain testnet. Testnet ETH has no intended monetary value."
                    : "Sample briefs let you explore topics, save questions, and draft a mission. They are examples with illustrative rewards and cannot receive transactions."
                }}
                Research is educational. Keep private information off-chain.
              </p>
            </div>
          </div>
          <button
            class="button primary full"
            @click="
              closeAll();
              scrollTo('missions');
            "
          >
            Find a question worth asking<UiIcon
              name="arrow"
              :size="17"
            /></button
        ></template>
        <div
          v-if="txStatus !== 'idle' && (busy || txError || txHash)"
          class="transaction-state"
          :class="{ error: txError }"
          :role="txError ? 'alert' : 'status'"
        >
          <span v-if="busy" class="spinner"></span
          ><UiIcon v-else :name="txError ? 'info' : 'check'" :size="18" />
          <p>
            {{
              txError ||
              (txStatus === "wallet"
                ? "Confirm the transaction in your wallet."
                : txStatus === "pending"
                  ? "Submitted. Waiting for network confirmation…"
                  : "Transaction confirmed.")
            }}<a
              v-if="explorerLink(txHash)"
              :href="explorerLink(txHash)"
              target="_blank"
              rel="noopener noreferrer"
              >View transaction ↗</a
            >
          </p>
        </div>
        <div
          v-if="notice && noticeKind !== 'bookmark' && !txHash && !txError"
          class="message neutral"
          role="status"
        >
          {{ notice }}
        </div>
      </div>
    </dialog>
    <div v-if="walletError && !modalOpen" class="toast error" role="alert">
      <UiIcon name="info" :size="20" />
      <p>{{ walletError }}</p>
      <button
        class="icon-button"
        @click="walletError = ''"
        aria-label="Dismiss wallet error"
      >
        <UiIcon name="close" :size="18" />
      </button>
    </div>
    <div
      v-if="notice && !modalOpen && !walletError"
      class="toast"
      role="status"
    >
      <UiIcon name="info" :size="20" />
      <p>
        {{ notice }}<a
          v-if="noticeKind === 'transaction' && txStatus === 'confirmed' && explorerLink(txHash)"
          :href="explorerLink(txHash)"
          target="_blank"
          rel="noopener noreferrer"
          >View confirmed transaction ↗</a
        >
      </p>
      <button v-if="canUndoSavedChange" class="text-button toast-undo" @click="undoSavedChange">
        Undo
      </button>
      <button
        class="icon-button"
        @click="dismissNotice"
        aria-label="Dismiss notification"
      >
        <UiIcon name="close" :size="18" />
      </button>
    </div>
  </div>
</template>
