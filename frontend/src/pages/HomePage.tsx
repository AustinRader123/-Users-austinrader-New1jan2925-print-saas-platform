import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import Footer from '../components/Footer';
import { Palette, PackageCheck, ClipboardList } from 'lucide-react';

export default function HomePage() {
  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <motion.h1 className="text-5xl font-extrabold mb-4 tracking-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            Design. Produce. Deliver.
          </motion.h1>
          <motion.p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            SkuFlow is a modern platform for custom product commerce — from on-site design to production and fulfillment.
          </motion.p>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <Card className="text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 text-blue-600 mx-auto mb-4">
                <Palette size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Design Products</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Create stunning custom designs with an intuitive on-site editor.
              </p>
            </Card>
            <Card className="text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 mx-auto mb-4">
                <PackageCheck size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Browse Catalog</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Explore supplier catalogs with rich variant data and imagery.
              </p>
            </Card>
            <Card className="text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-rose-100 text-rose-600 mx-auto mb-4">
                <ClipboardList size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Manage Orders</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Track production with clear job states and downloadable assets.
              </p>
            </Card>
          </div>

          <div className="mt-16">
            <Button size="lg" className="px-8" onClick={() => (window.location.href = '/designs')}>Start Designing</Button>
          </div>
        </div>
      </div>
    </div>
    <Footer />
    </>
  );
}
