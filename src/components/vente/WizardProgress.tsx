"use client";
import React from "react";
import { motion } from "framer-motion";

interface WizardStep {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
}

interface WizardProgressProps {
  steps: WizardStep[];
  currentStep: number;
}

export default function WizardProgress({ steps, currentStep }: WizardProgressProps) {
  return (
    <div className="wizard-progress-v2 py-6 px-4 mb-4 border-b border-slate-100 bg-slate-50/30">
      <div className="flex justify-between items-start max-w-4xl mx-auto relative">
        {steps.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center flex-1 relative z-10">
            <div
              className={`flex flex-col items-center group cursor-default`}
            >
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: currentStep >= step.id ? "#2563eb" : "#ffffff",
                  borderColor: currentStep >= step.id ? "#2563eb" : "#e2e8f0",
                  scale: currentStep === step.id ? 1.1 : 1,
                }}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg shadow-sm transition-colors`}
              >
                {currentStep > step.id ? (
                  <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className={`${currentStep === step.id ? "text-white" : "text-slate-400"}`}>{step.icon}</span>
                )}
              </motion.div>
              
              <div className="mt-2 text-center">
                <p className={`text-xs font-bold ${currentStep === step.id ? "text-blue-600" : "text-slate-500"}`}>
                  {step.title}
                </p>
                <p className="text-[10px] text-slate-400 hidden md:block">{step.subtitle}</p>
              </div>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="absolute top-5 left-[50%] w-full h-[2px] bg-slate-200 -z-10">
                <motion.div 
                  initial={false}
                  animate={{ width: currentStep > step.id ? "100%" : "0%" }}
                  className="h-full bg-blue-600"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
