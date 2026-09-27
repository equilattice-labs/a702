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
      <h2 id="hero-title">Make the proof <span>visible.</span></h2>
      <p>Source-backed bounties for Solana builders, researchers and curious wallets. Pick a pool, ship your signal, get reviewed.</p>
      <div class="hero-actions">
        <button class="button primary" aria-label="Explore board" @click="$emit('explore')">Browse pools<UiIcon name="arrow" :size="17" /></button>
        <button class="text-button" @click="$emit('create')">Post bounty<UiIcon name="plus" :size="16" /></button>
      </div>
      <div class="hero-caption"><span class="small-cross" aria-hidden="true">✦</span> PUBLIC PROOF <span>/</span> CREATOR SETTLEMENT</div>
    </div>
    <div class="research-signal">
      <div class="signal-header"><span><i class="status-dot"></i> MARKET SNAPSHOT</span><span>LIVE / TESTNET</span></div>
      <div class="signal-art" aria-hidden="true">
        <div class="market-stack"><div class="market-stack-top"><span>OPEN POOL</span><span>TESTNET</span></div><strong>{{ mission?.sample ? mission.reward : mission?.availableReward || "0.12" }} <small>SOL</small></strong><div class="market-stack-line"></div><p><span>NETWORK</span><b>SOLANA</b></p><p><span>SETTLEMENT</span><b>CREATOR REVIEW</b></p></div>
      </div>
      <div v-if="loading" class="featured-brief featured-status" role="status"><span class="spinner"></span>Loading pool feed…</div>
      <div v-else-if="error" class="featured-brief featured-status"><p>The bounty market couldn’t load.</p><button class="text-button" @click="$emit('retry')">Retry loading<UiIcon name="refresh" :size="16" /></button></div>
      <button v-else-if="mission" class="featured-brief" aria-label="Open featured bounty" @click="$emit('open', mission)"><span class="featured-label">{{ mission.sample ? "FEATURED / TESTNET SAMPLE" : "FEATURED / OPEN BOUNTY" }}</span><span class="featured-title">{{ mission.title }}</span><span class="featured-meta">{{ mission.sample ? mission.reward + ' SOL pool' : mission.availableReward + ' ' + (mission.rewardSymbol || 'POOL') }} <UiIcon name="arrow" :size="18" /></span></button>
      <div v-else class="featured-brief featured-status"><p>Your signal could start the next connection.</p><button class="text-button" @click="$emit('create')">Post the first bounty<UiIcon name="plus" :size="16" /></button></div>
    </div>
  </section>
</template>
