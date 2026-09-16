<script setup>
import UiIcon from "./UiIcon.vue";
defineProps({ mission: { type: Object, default: null }, loading: Boolean, error: { type: String, default: "" } });
defineEmits(["explore", "create", "open", "retry"]);
</script>

<template>
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero-copy">
      <div class="eyebrow"><span class="label-dash"></span>AN OPEN INVITATION TO INVESTIGATE</div>
      <h1 id="hero-title">Make room<br />for <em>discovery.</em></h1>
      <p>Good questions deserve more curious minds.<br class="desktop-break" /> Find a research mission, connect the evidence, and add your piece.</p>
      <div class="hero-actions">
        <button class="button primary" @click="$emit('explore')">Explore missions<UiIcon name="arrow" :size="18" /></button>
        <button class="text-button" @click="$emit('create')">Create a mission<UiIcon name="plus" :size="17" /></button>
      </div>
      <div class="hero-caption"><span class="caption-rule"></span>INDEPENDENT MINDS. COLLECTIVE DISCOVERY.</div>
    </div>
    <div class="discovery-poster">
      <div class="poster-heading"><span>THE TESSIVRA COLLECTIVE</span><span>FIELD NOTES / 001</span></div>
      <svg class="discovery-art" viewBox="0 0 480 260" fill="none" aria-hidden="true">
        <path d="M30 240H450M70 18V240M410 18V240" stroke="#242720" stroke-opacity=".18" stroke-dasharray="3 5" />
        <g transform="translate(66 14) rotate(-8 115 115)">
          <path d="M0 0H224V224H0Z" fill="#B9472B" />
          <path d="M112 24A88 88 0 1 0 200 112H112Z" fill="#F7F4EC" />
          <path d="M112 24V112H200A88 88 0 0 0 112 24Z" fill="#E7B89D" />
          <path d="M112 112L174 50M112 112V24M112 112H200M112 112L50 50M112 112H24M112 112L50 174M112 112V200M112 112L174 174" stroke="#B9472B" stroke-width="2" />
          <circle cx="112" cy="112" r="24" fill="#B9472B" />
        </g>
        <g transform="translate(274 73) rotate(9 73 73)">
          <path d="M0 0H146V146H0Z" fill="#242720" />
          <path d="M27 27H119V119H27Z" fill="#F7F4EC" />
          <path d="M73 27H119V73H73Z" fill="#E7B89D" />
          <path d="M87 58L130 15M100 15H130V45" stroke="#B9472B" stroke-width="7" />
        </g>
        <circle cx="394" cy="34" r="19" fill="#B9472B" />
        <path d="M385 34H403M394 25V43" stroke="#F7F4EC" stroke-width="2" />
      </svg>
      <div class="poster-caption"><span>Different perspectives.<br /><strong>A fuller picture.</strong></span><span class="poster-star" aria-hidden="true">✳</span></div>
      <div v-if="loading" class="featured-brief featured-status" role="status"><span class="spinner"></span>Finding the next question…</div>
      <div v-else-if="error" class="featured-brief featured-status"><p>The mission board couldn’t load.</p><button class="text-button" @click="$emit('retry')">Retry loading<UiIcon name="refresh" :size="16" /></button></div>
      <button v-else-if="mission" class="featured-brief" aria-label="Open featured mission" @click="$emit('open', mission)">
        <span class="featured-label">{{ mission.sample ? "A SAMPLE TO GET YOU THINKING" : "A QUESTION TO GET YOU THINKING" }}</span>
        <span class="featured-title">{{ mission.title }}</span><UiIcon name="arrow" :size="20" />
      </button>
      <div v-else class="featured-brief featured-status"><p>Every discovery needs a first question.</p><button class="text-button" @click="$emit('create')">Write the first brief<UiIcon name="plus" :size="16" /></button></div>
    </div>
  </section>
  <div class="research-ribbon" aria-label="Research process"><span><b>01</b> Ask a focused question</span><span class="ribbon-divider" aria-hidden="true">↗</span><span><b>02</b> Bring public evidence</span><span class="ribbon-divider" aria-hidden="true">↗</span><span><b>03</b> Review &amp; recognize</span><span class="ribbon-note">A LITTLE CURIOSITY GOES A LONG WAY.</span></div>
</template>
