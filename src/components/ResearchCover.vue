<script setup>
import UiIcon from "./UiIcon.vue";
defineProps({ mission: { type: Object, default: null }, loading: Boolean, error: { type: String, default: "" } });
defineEmits(["explore", "create", "open", "retry"]);
</script>

<template>
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero-copy">
      <div class="eyebrow"><span class="status-dot"></span>THE OPEN RESEARCH WORKSPACE</div>
      <h1 id="hero-title">Find the question.<br /><em>Build the evidence.</em></h1>
      <p>Follow a question worth answering. Bring the sources, share your findings, and make the next insight possible.</p>
      <div class="hero-actions">
        <button class="button primary" @click="$emit('explore')">Explore missions<UiIcon name="arrow" :size="18" /></button>
        <button class="text-button" @click="$emit('create')">Create a mission<UiIcon name="plus" :size="17" /></button>
      </div>
      <div class="hero-caption"><span>PUBLIC SOURCES</span><span>SHARED KNOWLEDGE</span><span>ON-CHAIN REWARDS</span></div>
    </div>
    <div class="evidence-map">
      <div class="map-header"><span class="status-dot"></span>FROM QUESTION TO CLARITY<span>↗</span></div>
      <svg class="evidence-art" viewBox="0 0 420 205" fill="none" aria-hidden="true">
        <defs><pattern id="map-grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#B6C4D1" fill-opacity=".18" /></pattern></defs>
        <rect width="420" height="205" fill="url(#map-grid)" />
        <path d="M83 62H157C172 62 172 101 189 101H215M83 150H157C172 150 172 101 189 101M239 101H270C290 101 290 48 306 48H331M270 101C290 101 290 158 306 158H337" stroke="#536B7A" stroke-width="1.5" />
        <path d="M124 62H156C172 62 172 101 189 101H215M239 101H270C290 101 290 48 306 48H331" stroke="#8FE5C1" stroke-width="2" />
        <rect x="35" y="42" width="96" height="41" rx="5" fill="#253E4C" stroke="#415966" /><path d="M48 55H68M48 61H89M48 67H78" stroke="#9DB3C1" stroke-width="2" /><circle cx="112" cy="62" r="5" fill="#A4D7FF" />
        <rect x="35" y="129" width="96" height="41" rx="5" fill="#253E4C" stroke="#415966" /><path d="M49 154V143M57 154V139M65 154V146M73 154V136M82 154H101" stroke="#9DB3C1" stroke-width="2" />
        <rect x="177" y="60" width="83" height="83" rx="16" fill="#9BF0CF" /><path d="M199 81H222L239 98V122H199V81Z" stroke="#133A34" stroke-width="2" /><path d="M221 81V99H239M207 108H230M207 115H222" stroke="#133A34" stroke-width="2" />
        <circle cx="341" cy="48" r="20" fill="#DDF9ED" /><path d="m333 48 5 5 11-11" stroke="#173F35" stroke-width="2" />
        <circle cx="341" cy="158" r="20" fill="#253E4C" stroke="#526F7A" /><path d="M334 158H348M341 151V165" stroke="#B4CBCF" stroke-width="2" />
        <circle cx="146" cy="62" r="3" fill="#A0E9C9" /><circle cx="296" cy="68" r="3" fill="#A0E9C9" />
        <text x="43" y="28" fill="#A9BDC8" font-size="9" font-family="Arial,sans-serif" letter-spacing="1.5">SOURCES</text><text x="189" y="165" fill="#A9BDC8" font-size="9" font-family="Arial,sans-serif" letter-spacing="1.5">EVIDENCE</text><text x="315" y="91" fill="#A9BDC8" font-size="9" font-family="Arial,sans-serif" letter-spacing="1.5">INSIGHT</text>
      </svg>
      <div v-if="loading" class="featured-brief featured-status" role="status"><span class="spinner"></span>Finding the next question…</div>
      <div v-else-if="error" class="featured-brief featured-status"><p>The mission board couldn’t load.</p><button class="text-button" @click="$emit('retry')">Retry loading<UiIcon name="refresh" :size="16" /></button></div>
      <button v-else-if="mission" class="featured-brief" aria-label="Open featured mission" @click="$emit('open', mission)">
        <span class="featured-label">{{ mission.sample ? "FEATURED SAMPLE BRIEF" : "IN FOCUS" }}</span>
        <span class="featured-title">{{ mission.title }}</span><UiIcon name="arrow" :size="20" />
      </button>
      <div v-else class="featured-brief featured-status"><p>Start the next line of inquiry.</p><button class="text-button" @click="$emit('create')">Write the first brief<UiIcon name="plus" :size="16" /></button></div>
    </div>
  </section>
  <div class="research-ribbon" aria-label="Research process"><span><b>01</b> A focused question</span><span class="ribbon-divider" aria-hidden="true">→</span><span><b>02</b> Verifiable evidence</span><span class="ribbon-divider" aria-hidden="true">→</span><span><b>03</b> A useful contribution</span><span class="ribbon-note">BUILT IN THE OPEN.</span></div>
</template>
