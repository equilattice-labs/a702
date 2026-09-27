<script setup>
import UiIcon from "./UiIcon.vue";
import { amountText } from "../utils/format";
import { SOLANA_CLUSTER } from "../config";
defineProps({ mission: { type: Object, required: true }, index: Number, saved: Boolean, icon: String, tone: String });
defineEmits(["open", "save"]);
</script>

<template>
  <article class="mission-card" :class="tone">
    <button class="mission-row-main" @click="$emit('open', mission)">
      <span class="market-rank">{{ String(index + 1).padStart(2, "0") }}</span>
      <span class="topic-symbol"><UiIcon :name="icon || 'layers'" :size="18" /></span>
      <span class="market-name"><h3><strong>{{ mission.title }}</strong></h3><small class="category-label">{{ mission.category }}</small><small class="preview-tag">{{ mission.sample ? "TESTNET SAMPLE" : mission.status }}</small><p class="mission-description">{{ mission.description }}</p></span>
      <span class="market-signal"><i class="status-dot"></i>{{ mission.sample ? "OPEN" : mission.status.toUpperCase() }}</span>
      <span class="market-deadline"><small>{{ mission.sample ? "BRIEF" : "DEADLINE" }}</small>{{ mission.sample ? mission.difficulty : mission.deadline }}</span>
      <span class="market-reward"><small>{{ mission.sample ? "PREVIEW POOL" : "AVAILABLE POOL" }}</small><strong>{{ amountText(mission.sample ? mission.reward : mission.availableReward) }} <em>{{ mission.rewardSymbol || "SOL" }}</em></strong></span>
    </button>
    <div class="market-row-actions">
      <span class="reward-network">{{ SOLANA_CLUSTER.toUpperCase() }}</span>
      <button class="icon-button bookmark-button" :class="{ saved }" :aria-pressed="saved" :aria-label="`${saved ? 'Unsave' : 'Save'} ${mission.title}`" @click.stop="$emit('save', mission)"><UiIcon name="bookmark" :size="18" /></button>
      <button class="read-brief" @click.stop="$emit('open', mission)">View<UiIcon name="arrow" :size="17" /></button>
    </div>
  </article>
</template>
