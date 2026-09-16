<script setup>
import UiIcon from "./UiIcon.vue";
import { amountText } from "../utils/format";
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
    <div class="card-art" aria-hidden="true"><span class="card-number">FIELD {{ String(index + 1).padStart(2, "0") }}</span><span class="tile-symbol"><span></span><span></span><span></span><span></span></span><span class="art-cross">+</span></div>
    <div class="card-main">
      <div class="card-top">
        <span class="category-label"
          ><UiIcon :name="icon || 'book'" :size="15" />{{
            mission.category
          }}</span
        >
        <button
          class="icon-button bookmark-button"
          :class="{ saved }"
          :aria-pressed="saved"
          :aria-label="`${saved ? 'Unsave' : 'Save'} ${mission.title}`"
          @click="$emit('save', mission)"
        >
          <UiIcon name="bookmark" :size="18" />
        </button>
      </div>
      <div class="mission-meta">
        <span class="status-dot"></span
        >{{ mission.sample ? "SAMPLE BRIEF" : mission.status }}
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
            ? "Explore the example"
            : `${mission.submissions} contributions`
        }}</span>
      </div>
    </div>
    <div class="card-aside">
      <div class="mission-reward">
        <span>{{ mission.sample ? "SAMPLE ? TESTNET ETH" : "AVAILABLE ? TESTNET ETH" }}</span
        ><strong
          :title="`${mission.sample ? mission.reward : mission.availableReward} ETH`"
          >{{
            amountText(
              mission.sample ? mission.reward : mission.availableReward,
            )
          }}
          <small>ETH</small></strong
        >
      </div>
      <button class="read-brief" @click="$emit('open', mission)">
        Read brief<UiIcon name="arrow" :size="18" />
      </button>
    </div>
  </article>
</template>
