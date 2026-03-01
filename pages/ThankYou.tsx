import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { motion } from 'motion/react';

const ThankYou: React.FC = () => {
    const { t, language, dir } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

    const { firstName, phone } = location.state || { firstName: '', phone: '' };

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const successMsg = t('successMessage')
        .replace('{name}', firstName || '')
        .replace('{phone}', phone || '');

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-16 text-center bg-gray-50">
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-brand-yellow p-6 md:p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-8"
            >
                <CheckCircle className="w-16 h-16 md:w-24 md:h-24 text-black" />
            </motion.div>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="w-full max-w-3xl"
            >
                <h1 className="text-4xl md:text-7xl font-black mb-8 uppercase tracking-tighter leading-none">
                    {language === 'ar' ? 'تم استلام طلبك بنجاح!' : 'ORDER RECEIVED!'}
                </h1>

                <div className="max-w-xl mx-auto bg-white border-4 border-black p-8 md:p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] mb-12">
                    <p className="text-xl md:text-2xl font-bold leading-relaxed text-black">
                        {successMsg}
                    </p>
                </div>

                <button
                    onClick={() => navigate('/')}
                    className="group inline-flex items-center gap-4 bg-black text-brand-yellow px-10 py-5 font-black text-xl uppercase tracking-widest hover:bg-brand-yellow hover:text-black transition-all border-b-4 border-yellow-600 active:border-b-0 active:translate-y-[4px]"
                >
                    {t('backToStore')}
                    <ArrowIcon className="w-7 h-7" />
                </button>
            </motion.div>
        </div>
    );
};

export default ThankYou;
