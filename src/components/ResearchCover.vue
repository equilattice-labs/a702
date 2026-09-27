<script setup>
import UiIcon from "./UiIcon.vue";

defineProps({
  mission: { type: Object, default: null },
  loading: Boolean,
  error: { type: String, default: "" },
});

defineEmits(["explore", "create", "open", "retry"]);
</script>

<template>
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero-copy">
      <div class="hero-kicker"><span class="status-dot"></span> MARKET / OPEN POOLS</div>
      <h2 id="hero-title">Make every claim <span>traceable.</span></h2>
      <p>Open bounties for Solana builders and researchers. Pick a brief, attach verifiable sources, and let the creator settle the signal.</p>
      <div class="hero-actions">
        <button class="button primary" aria-label="Explore board" @click="$emit('explore')">Browse pools<UiIcon name="arrow" :size="17" /></button>
        <button class="text-button" @click="$emit('create')">Post bounty<UiIcon name="plus" :size="16" /></button>
      </div>
      <div class="hero-caption"><span class="small-cross" aria-hidden="true">+</span> PUBLIC PROOF <span>/</span> CREATOR SETTLEMENT</div>
      <div class="hero-proof-row" aria-label="Protocol guarantees">
        <span><i class="status-dot"></i> WALLET READY</span>
        <span><i class="status-dot"></i> SOURCES INDEXED</span>
        <span><i class="status-dot"></i> REVIEW VISIBLE</span>
      </div>
    </div>
    <div class="research-signal">
      <div class="signal-header"><span><i class="status-dot"></i> MARKET SNAPSHOT</span><span>PREVIEW / TESTNET</span></div>
      <div class="signal-art" aria-hidden="true">
        <div class="market-stack">
          <div class="market-stack-top"><span>OPEN POOL</span><span>TESTNET</span></div>
          <strong>{{ mission?.sample ? mission.reward : mission?.availableReward || "0.12" }} <small>SOL</small></strong>
          <div class="market-stack-line"><span></span></div>
          <div class="market-stack-bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <p><span>NETWORK</span><b>SOLANA</b></p>
          <p><span>SETTLEMENT</span><b>CREATOR REVIEW</b></p>
          <p><span>FINALITY</span><b>SIMULATED</b></p>
        </div>
      </div>
      <div v-if="loading" class="featured-brief featured-status" role="status"><span class="spinner"></span>Loading pool feed...</div>
      <div v-else-if="error" class="featured-brief featured-status"><p>The bounty market couldn't load.</p><button class="text-button" @click="$emit('retry')">Retry loading<UiIcon name="refresh" :size="16" /></button></div>
      <button v-else-if="mission" class="featured-brief" aria-label="Open featured bounty" @click="$emit('open', mission)"><span class="featured-label">{{ mission.sample ? "FEATURED / TESTNET SAMPLE" : "FEATURED / OPEN BOUNTY" }}</span><span class="featured-title">{{ mission.title }}</span><span class="featured-meta">{{ mission.sample ? mission.reward + ' SOL pool' : mission.availableReward + ' ' + (mission.rewardSymbol || 'POOL') }} <UiIcon name="arrow" :size="18" /></span></button>
      <div v-else class="featured-brief featured-status"><p>Your signal could start the next connection.</p><button class="text-button" @click="$emit('create')">Post the first bounty<UiIcon name="plus" :size="16" /></button></div>
    </div>
  </section>
</template>

<style scoped>
.hero-proof-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 15px;
  margin-top: 13px;
  color: #7f8b9a;
  font: 8px/1.4 var(--mono);
  letter-spacing: .08em;
}

.hero-proof-row span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.hero-proof-row .status-dot {
  width: 4px;
  height: 4px;
  color: var(--brand);
  box-shadow: 0 0 0 3px rgb(185 255 74 / 10%);
}

.market-stack-line {
  position: relative;
}

.market-stack-line span {
  display: block;
  width: 72%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--brand), #64d8ff);
}

.market-stack-bars {
  display: flex;
  align-items: end;
  gap: 4px;
  height: 28px;
  margin: 1px 0 10px;
  opacity: .8;
}

.market-stack-bars i {
  display: block;
  width: 100%;
  min-width: 4px;
  height: 35%;
  border-radius: 2px 2px 0 0;
  background: #51d8c9;
}

.market-stack-bars i:nth-child(2) { height: 55%; }
.market-stack-bars i:nth-child(3) { height: 42%; }
.market-stack-bars i:nth-child(4) { height: 75%; }
.market-stack-bars i:nth-child(5) { height: 57%; }
.market-stack-bars i:nth-child(6) { height: 88%; background: var(--brand); }
.market-stack-bars i:nth-child(7) { height: 68%; }
.market-stack-bars i:nth-child(8) { height: 100%; background: var(--brand); }

@media (max-width: 760px) {
  .hero-proof-row { gap: 8px 12px; }
  .market-stack-bars { height: 24px; }
}
</style>
