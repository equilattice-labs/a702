<script setup>
import UiIcon from "./UiIcon.vue";
import { amountText } from "../utils/format";
import { SOLANA_CLUSTER } from "../config";
defineProps({
  mission: { type: Object, required: true },
  index: Number,
  saved: Boolean,
  icon: String,
  tone: String,
});
defineEmits(["open", "save"]);
</script>

<template>
  <article class="mission-card" :class="tone">
    <div class="card-top">
      <span class="topic-symbol"
        ><UiIcon :name="icon || 'layers'" :size="21" /></span
      ><span class="category-label">{{ mission.category }}</span
      ><button
        class="icon-button bookmark-button"
        :class="{ saved }"
        :aria-pressed="saved"
        :aria-label="`${saved ? 'Unsave' : 'Save'} ${mission.title}`"
        @click="$emit('save', mission)"
      >
        <UiIcon name="bookmark" :size="18" />
      </button>
    </div>
    <div class="card-main">
      <div class="card-index">
        <span>BOUNTY #{{ String(index + 1).padStart(2, "0") }}</span
        ><span class="mission-meta"
          ><span class="status-dot"></span
          >{{ mission.sample ? "TESTNET SAMPLE" : mission.status }}</span
        >
      </div>
      <h3>
        <button @click="$emit('open', mission)">{{ mission.title }}</button>
      </h3>
      <p class="mission-description">{{ mission.description }}</p>
      <div class="mission-foot">
        <span
          ><UiIcon :name="mission.sample ? 'book' : 'clock'" :size="14" />{{
            mission.sample ? mission.difficulty : mission.deadline
          }}</span
        ><span>{{
          mission.sample
            ? "Preview bounty"
            : `${mission.submissions} contributions`
        }}</span>
      </div>
    </div>
    <div class="card-aside">
      <div class="mission-reward">
        <span>{{
          mission.sample ? "PREVIEW POOL" : "REWARD POOL"
        }}</span
        ><strong
          :title="`${mission.sample ? mission.reward : mission.availableReward} ${mission.rewardSymbol || 'SOL'}`"
          >{{
            amountText(
              mission.sample ? mission.reward : mission.availableReward,
            )
          }}
          <small>{{ mission.rewardSymbol || "SOL" }}</small></strong
        ><span class="reward-network">{{ SOLANA_CLUSTER.toUpperCase() }}</span>
      </div>
      <button class="read-brief" @click="$emit('open', mission)">
        View bounty<UiIcon name="arrow" :size="18" />
      </button>
    </div>
  </article>
</template>
