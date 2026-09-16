<script setup>
import UiIcon from "./UiIcon.vue";
defineProps({ mission: { type: Object, default: null }, loading: Boolean, error: { type: String, default: "" } });
defineEmits(["explore", "create", "open", "retry"]);
</script>

<template>
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero-copy">
      <div class="eyebrow"><span class="label-dash"></span>A HOME FOR OPEN RESEARCH</div>
      <h1 id="hero-title">Every finding<br />starts <em>somewhere.</em></h1>
      <p>Pick a question worth asking. Follow the sources.<br class="desktop-break" /> Build something the next researcher can stand on.</p>
      <div class="hero-actions">
        <button class="button primary" @click="$emit('explore')">Explore missions<UiIcon name="arrow" :size="18" /></button>
        <button class="text-button" @click="$emit('create')">Create a mission<UiIcon name="plus" :size="17" /></button>
      </div>
      <div class="hero-caption"><span class="caption-rule"></span>PUBLIC SOURCES. HUMAN REVIEW. SHARED PROGRESS.</div>
    </div>
    <div class="field-note">
      <div class="note-heading"><span class="eyebrow">THE VERCAIRN METHOD</span><UiIcon name="external" :size="17" /></div>
      <div class="cairn-illustration" aria-hidden="true">
        <svg viewBox="0 0 320 170" fill="none">
          <path d="M28 145H292M160 12V159" stroke="currentColor" stroke-opacity=".17" stroke-dasharray="3 5"/>
          <ellipse cx="160" cy="144" rx="102" ry="12" stroke="currentColor" stroke-opacity=".22"/>
          <path d="M75 120L206 106L230 139L68 144Z" fill="#20212A"/>
          <path d="M107 80L195 75L213 102L92 114Z" fill="#6852D6"/>
          <path d="M135 47L181 44L195 69L120 77Z" fill="#B4A6EC" stroke="#6852D6"/>
          <path d="M158 10L170 22L158 34L146 22Z" fill="#6852D6"/>
          <path d="M222 82H271M235 124H283M177 24H225" stroke="currentColor" stroke-opacity=".4"/>
          <circle cx="275" cy="82" r="3" fill="#6852D6"/>
        </svg>
      </div>
      <ol class="method-key"><li><span>01</span>Ask</li><li><span>02</span>Investigate</li><li><span>03</span>Review</li></ol>
      <div v-if="loading" class="featured-brief featured-status" role="status"><span class="spinner"></span>Finding the next question&#8230;</div>
      <div v-else-if="error" class="featured-brief featured-status"><p>Research is a little out of reach.</p><button class="text-button" @click="$emit('retry')">Retry loading<UiIcon name="refresh" :size="16" /></button></div>
      <button v-else-if="mission" class="featured-brief" aria-label="Open featured mission" @click="$emit('open', mission)">
        <span class="featured-label">{{ mission.sample ? "START WITH A SAMPLE" : "YOUR STARTING POINT" }}</span>
        <span class="featured-title">{{ mission.title }}</span><UiIcon name="arrow" :size="20" />
      </button>
      <div v-else class="featured-brief featured-status"><p>The first question could be yours.</p><button class="text-button" @click="$emit('create')">Write the first brief<UiIcon name="plus" :size="16" /></button></div>
    </div>
  </section>
</template>
